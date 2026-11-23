import { describe, expect, it, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { generateAccessToken } from '../utils/auth.js';
import {
  setCachedMatches,
  invalidateRankingCache,
  appendMatchEvent,
} from '../services/rankingService.js';
import {
  computeAndEmitRankingDiffs,
  handleLivePointEvent,
} from '../sockets/rankingSocket.js';
import type { RankingMatch } from '@rallypoint/ranking';

const TEST_MATCHES: RankingMatch[] = [
  {
    id: 'test-m-1',
    seasonId: 'Season 2026',
    matchType: 'SINGLES',
    status: 'COMPLETED',
    winnerSide: 'A',
    participants: [
      { playerId: 'p-viktor', displayName: 'Viktor Axelsen', side: 'A', position: 1 },
      { playerId: 'p-lee', displayName: 'Lee Zii Jia', side: 'B', position: 1 },
    ],
    games: [
      { gameNumber: 1, scoreA: 21, scoreB: 12, winnerSide: 'A' },
      { gameNumber: 2, scoreA: 21, scoreB: 14, winnerSide: 'A' },
    ],
    events: [
      {
        id: 'e1',
        sequenceNumber: 1,
        eventType: 'POINT',
        side: 'A',
        shotType: 'SMASH',
        rallyEndResult: 'WINNER',
        pointWinnerPlayerId: 'p-viktor',
      },
      {
        id: 'e2',
        sequenceNumber: 2,
        eventType: 'POINT',
        side: 'B',
        shotType: 'DROP',
        rallyEndResult: 'WINNER',
        pointWinnerPlayerId: 'p-lee',
      },
    ],
  },
  {
    id: 'test-m-2',
    seasonId: 'Season 2026',
    matchType: 'SINGLES',
    status: 'COMPLETED',
    winnerSide: 'A',
    participants: [
      { playerId: 'p-momota', displayName: 'Kento Momota', side: 'A', position: 1 },
      { playerId: 'p-shi', displayName: 'Shi Yuqi', side: 'B', position: 1 },
    ],
    games: [
      { gameNumber: 1, scoreA: 21, scoreB: 19, winnerSide: 'A' },
      { gameNumber: 2, scoreA: 21, scoreB: 17, winnerSide: 'A' },
    ],
    events: [
      {
        id: 'e3',
        sequenceNumber: 1,
        eventType: 'POINT',
        side: 'A',
        shotType: 'NET',
        rallyEndResult: 'WINNER',
        pointWinnerPlayerId: 'p-momota',
      },
    ],
  },
];

describe('Ranking REST Endpoints & Sync (Phase 4)', () => {
  const adminToken = generateAccessToken({
    userId: 'admin-1',
    email: 'admin@rallypoint.io',
    role: 'ADMIN',
  });

  const viewerToken = generateAccessToken({
    userId: 'viewer-1',
    email: 'viewer@rallypoint.io',
    role: 'VIEWER',
  });

  beforeEach(() => {
    setCachedMatches([...TEST_MATCHES]);
    invalidateRankingCache();
  });

  describe('GET /api/rankings/:category', () => {
    it('returns paginated rankings with 5s Cache-Control header and Matches count', async () => {
      const res = await request(app)
        .get('/api/rankings/overall?page=1&limit=10')
        .expect(200);

      expect(res.headers['cache-control']).toBe('public, max-age=5');
      expect(res.body.category).toBe('OVERALL');
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.total).toBeGreaterThan(0);
      expect(res.body.entries.length).toBeGreaterThan(0);

      const first = res.body.entries[0];
      expect(first).toHaveProperty('rank');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('matchesPlayed');
      expect(first).toHaveProperty('headlineFormatted');
    });

    it('returns cached: true on immediate subsequent call', async () => {
      const res1 = await request(app).get('/api/rankings/most_wins').expect(200);
      expect(res1.body.cached).toBe(false);

      const res2 = await request(app).get('/api/rankings/most_wins').expect(200);
      expect(res2.body.cached).toBe(true);
    });

    it('rejects invalid category with 400 status', async () => {
      const res = await request(app).get('/api/rankings/unknown_category').expect(400);
      expect(res.body.error).toMatch(/invalid ranking category/i);
    });
  });

  describe('GET /api/rankings/player/:id', () => {
    it('returns detailed player statistics and cross-category ranks', async () => {
      const res = await request(app).get('/api/rankings/player/p-viktor').expect(200);

      expect(res.body.playerId).toBe('p-viktor');
      expect(res.body.name).toBe('Viktor Axelsen');
      expect(res.body.stats.matchesPlayed).toBe(1);
      expect(res.body.ranks).toHaveProperty('OVERALL');
      expect(res.body.ranks.OVERALL.rank).toBe(1);
      expect(res.body.rankHistory.length).toBeGreaterThan(0);
    });

    it('returns 404 for non-existent player', async () => {
      const res = await request(app).get('/api/rankings/player/non-existent-player').expect(404);
      expect(res.body.error).toMatch(/player not found/i);
    });
  });

  describe('GET /api/rankings/head-to-head', () => {
    it('returns head-to-head record and point aggregates', async () => {
      const res = await request(app)
        .get('/api/rankings/head-to-head?player1=p-viktor&player2=p-lee')
        .expect(200);

      expect(res.body.matchesPlayed).toBe(1);
      expect(res.body.wins['p-viktor']).toBe(1);
      expect(res.body.wins['p-lee']).toBe(0);
      expect(res.body.points['p-viktor']).toBe(42);
      expect(res.body.points['p-lee']).toBe(26);
    });

    it('returns 400 when query parameters are missing', async () => {
      const res = await request(app).get('/api/rankings/head-to-head?player1=p-viktor').expect(400);
      expect(res.body.error).toMatch(/player1 and player2/i);
    });
  });

  describe('GET /api/teams/rankings', () => {
    it('returns doubles pairs and club teams standings', async () => {
      const res = await request(app).get('/api/teams/rankings').expect(200);

      expect(res.body).toHaveProperty('doublesPairs');
      expect(res.body).toHaveProperty('clubTeams');
      expect(res.body.clubTeams.length).toBeGreaterThan(0);
      expect(res.body.clubTeams[0].name).toBe('Thunder Shuttlers');
    });
  });

  describe('Admin Endpoints (RBAC & Rebuild)', () => {
    it('rejects unauthenticated requests to rebuild-rankings with 401', async () => {
      await request(app).post('/api/admin/rebuild-rankings').expect(401);
    });

    it('rejects non-admin role with 403', async () => {
      await request(app)
        .post('/api/admin/rebuild-rankings')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('allows ADMIN to rebuild rankings from raw match events', async () => {
      const res = await request(app)
        .post('/api/admin/rebuild-rankings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ seasonId: 'Season 2026' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.matchesReplayed).toBe(2);
      expect(res.body.leaderboards).toHaveProperty('OVERALL');
    });

    it('allows ADMIN to recalculate streaks and updates audit log', async () => {
      const res = await request(app)
        .post('/api/admin/recalculate-streaks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.streaks.length).toBeGreaterThan(0);

      // Verify audit log has recorded the action
      const logRes = await request(app)
        .get('/api/admin/audit-log')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(logRes.body.logs[0].action).toBe('RECALCULATE_STREAKS');
      expect(logRes.body.logs[0].performedBy).toBe('admin@rallypoint.io');
    });

    it('triggers daily rollup and produces community award snapshots', async () => {
      const res = await request(app)
        .post('/api/admin/daily-rollup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.awards.length).toBeGreaterThan(0);
      expect(res.body.awards[0]).toHaveProperty('title');
    });
  });

  describe('Live Sync & Cache Invalidation', () => {
    it('computes rank diffs correctly on live match events', () => {
      // Recompute baseline
      computeAndEmitRankingDiffs();

      // Append new match event where Lee wins many points and a match
      appendMatchEvent('test-m-1', {
        id: 'new-e-1',
        sequenceNumber: 3,
        eventType: 'POINT',
        side: 'B',
        shotType: 'SMASH',
        rallyEndResult: 'WINNER',
        pointWinnerPlayerId: 'p-lee',
      });

      // Diff calculation
      const diffs = computeAndEmitRankingDiffs();
      expect(Array.isArray(diffs)).toBe(true);
    });

    it('debounces live point event by 500ms and triggers callback with diffs', async () => {
      vi.useFakeTimers();
      const onDiff = vi.fn();

      handleLivePointEvent(
        'test-m-1',
        {
          id: 'debounce-e-1',
          sequenceNumber: 10,
          eventType: 'POINT',
          side: 'A',
          shotType: 'SMASH',
          rallyEndResult: 'WINNER',
          pointWinnerPlayerId: 'p-viktor',
        },
        onDiff
      );

      // Should not be called immediately (debouncing)
      expect(onDiff).not.toHaveBeenCalled();

      // Fast-forward 500ms
      vi.advanceTimersByTime(500);

      expect(onDiff).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });
});
