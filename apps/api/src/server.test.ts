import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './app.js';

describe('RallyPoint API Integration Tests', () => {
  let accessToken: string;
  const testMatchId = `match-test-${Date.now()}`;

  it('responds with healthy status on /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('registers and logs in a scorer user', async () => {
    const email = `scorer-${Date.now()}@rallypoint.local`;
    const regRes = await request(app).post('/api/auth/register').send({
      email,
      password: 'password123',
      role: 'SCORER',
    });

    expect(regRes.status).toBe(201);
    expect(regRes.body.accessToken).toBeDefined();

    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password: 'password123',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeDefined();
    accessToken = loginRes.body.accessToken;
  });

  it('creates a match with authorization', async () => {
    const res = await request(app)
      .post('/api/matches')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        id: testMatchId,
        mode: 'singles',
        bestOf: 3,
        sideA: { id: 'sa', name: 'Viktor Axelsen', playerIds: ['va'] },
        sideB: { id: 'sb', name: 'Lee Zii Jia', playerIds: ['lzj'] },
        initialServerSide: 'A',
        initialServerPlayerId: 'va',
      });

    expect(res.status).toBe(201);
    expect(res.body.matchId).toBe(testMatchId);
    expect(res.body.state.currentScoreA).toBe(0);
  });

  it('syncs events idempotently and returns derived state', async () => {
    const event1 = {
      id: `pt-sync-1-${Date.now()}`,
      matchId: testMatchId,
      timestamp: Date.now(),
      type: 'POINT',
      side: 'A',
      rallyEndType: 'SMASH',
    };

    const syncRes1 = await request(app)
      .post(`/api/matches/${testMatchId}/events/sync`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        events: [event1],
      });

    expect(syncRes1.status).toBe(200);
    expect(syncRes1.body.appliedCount).toBe(1);
    expect(syncRes1.body.duplicateCount).toBe(0);
    expect(syncRes1.body.state.currentScoreA).toBe(1);

    // Resending the same event (idempotency verification)
    const syncRes2 = await request(app)
      .post(`/api/matches/${testMatchId}/events/sync`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        events: [event1],
      });

    expect(syncRes2.status).toBe(200);
    expect(syncRes2.body.appliedCount).toBe(0);
    expect(syncRes2.body.duplicateCount).toBe(1);
    expect(syncRes2.body.state.currentScoreA).toBe(1);
  });

  it('serves live public big-screen TV scoreboard', async () => {
    const res = await request(app).get(`/api/matches/${testMatchId}/live`);
    expect(res.status).toBe(200);
    expect(res.body.live).toBe(true);
    expect(res.body.currentScoreA).toBe(1);
    expect(res.body.nameA).toBe('Viktor Axelsen');
    expect(res.body.spectators).toBeGreaterThanOrEqual(1);
  });

  it('serves match streaks and milestones via GET /api/matches/:id/streaks', async () => {
    const res = await request(app).get(`/api/matches/${testMatchId}/streaks`);
    expect(res.status).toBe(200);
    expect(res.body.teamRuns).toBeDefined();
    expect(res.body.playerStreaks).toBeDefined();
  });

  it('serves match awards and MVP calculations via GET /api/matches/:id/awards', async () => {
    const res = await request(app).get(`/api/matches/${testMatchId}/awards`);
    expect(res.status).toBe(200);
    expect(res.body.formulaVersion).toBeDefined();
    expect(res.body.allContributions).toBeDefined();
  });

  it('creates and searches players via player API', async () => {
    const createRes = await request(app)
      .post('/api/players')
      .send({ displayName: 'Anu Sharma', nickname: 'Ace' });
    expect(createRes.status).toBe(201);

    const res = await request(app).get('/api/players?q=anu');
    expect(res.status).toBe(200);
    expect(res.body.players.length).toBeGreaterThanOrEqual(1);
    expect(res.body.players[0].displayName).toContain('Anu');
  });
});
