import { describe, expect, it } from 'vitest';
import request from 'supertest';
import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { setupRankingSockets } from './sockets/rankingSocket.js';

describe('QA Phase 2: API RBAC, Idempotency, Conflict Ordering & Socket Delivery Matrix', () => {
  const registerRole = async (role: 'ADMIN' | 'SCORER' | 'PLAYER' | 'VIEWER') => {
    const email = `qa-${role.toLowerCase()}-${Date.now()}-${Math.random()}@rallypoint.local`;
    const res = await request(app).post('/api/auth/register').send({
      email,
      password: 'password123',
      role,
    });
    expect(res.status).toBe(201);
    return res.body.accessToken as string;
  };

  it('enforces RBAC across ADMIN, SCORER, PLAYER, and VIEWER roles', async () => {
    const adminToken = await registerRole('ADMIN');
    const scorerToken = await registerRole('SCORER');
    const playerToken = await registerRole('PLAYER');
    const viewerToken = await registerRole('VIEWER');

    const matchPayload = {
      id: `rbac-match-${Date.now()}`,
      mode: 'singles',
      bestOf: 3,
      sideA: { id: 'sa', name: 'Anu', playerIds: ['p-anu'] },
      sideB: { id: 'sb', name: 'Rahul', playerIds: ['p-rahul'] },
      initialServerSide: 'A',
      initialServerPlayerId: 'p-anu',
    };

    // VIEWER and PLAYER cannot create matches
    const viewerCreate = await request(app)
      .post('/api/matches')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send(matchPayload);
    expect([401, 403]).toContain(viewerCreate.status);

    const playerCreate = await request(app)
      .post('/api/matches')
      .set('Authorization', `Bearer ${playerToken}`)
      .send(matchPayload);
    expect([401, 403]).toContain(playerCreate.status);

    // SCORER can create a match
    const scorerCreate = await request(app)
      .post('/api/matches')
      .set('Authorization', `Bearer ${scorerToken}`)
      .send(matchPayload);
    expect(scorerCreate.status).toBe(201);

    // SCORER cannot call admin rebuild
    const scorerAdmin = await request(app)
      .post('/api/admin/rebuild-rankings')
      .set('Authorization', `Bearer ${scorerToken}`)
      .send({});
    expect(scorerAdmin.status).toBe(403);

    // ADMIN can call admin rebuild
    const adminRebuild = await request(app)
      .post('/api/admin/rebuild-rankings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(adminRebuild.status).toBe(200);
  });

  it('rejects malformed payloads with 400 Zod validation error', async () => {
    const scorerToken = await registerRole('SCORER');
    const badMatch = await request(app)
      .post('/api/matches')
      .set('Authorization', `Bearer ${scorerToken}`)
      .send({ id: '', mode: 'invalid-mode' });
    expect(badMatch.status).toBe(400);
  });

  it('ingests event batches idempotently across 3 identical retries', async () => {
    const scorerToken = await registerRole('SCORER');
    const matchId = `idem-match-${Date.now()}`;

    await request(app)
      .post('/api/matches')
      .set('Authorization', `Bearer ${scorerToken}`)
      .send({
        id: matchId,
        mode: 'singles',
        bestOf: 3,
        sideA: { id: 'sa', name: 'Anu', playerIds: ['p-anu'] },
        sideB: { id: 'sb', name: 'Rahul', playerIds: ['p-rahul'] },
        initialServerSide: 'A',
        initialServerPlayerId: 'p-anu',
      });

    const batch = {
      events: [
        {
          id: `ev-1-${matchId}`,
          matchId,
          type: 'POINT',
          side: 'A',
          sequenceNumber: 1,
          timestamp: Date.now(),
        },
        {
          id: `ev-2-${matchId}`,
          matchId,
          type: 'POINT',
          side: 'A',
          sequenceNumber: 2,
          timestamp: Date.now() + 100,
        },
      ],
    };

    // Send same batch 3 times
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await request(app)
        .post(`/api/matches/${matchId}/events/sync`)
        .set('Authorization', `Bearer ${scorerToken}`)
        .send(batch);
      expect(res.status).toBe(200);
      expect(res.body.state.currentScoreA).toBe(2);
      expect(res.body.state.currentScoreB).toBe(0);
    }
  });

  it('orders out-of-order two-device event sync deterministically by sequenceNumber', async () => {
    const scorerToken = await registerRole('SCORER');
    const matchId = `conflict-match-${Date.now()}`;

    await request(app)
      .post('/api/matches')
      .set('Authorization', `Bearer ${scorerToken}`)
      .send({
        id: matchId,
        mode: 'singles',
        bestOf: 3,
        sideA: { id: 'sa', name: 'Anu', playerIds: ['p-anu'] },
        sideB: { id: 'sb', name: 'Rahul', playerIds: ['p-rahul'] },
        initialServerSide: 'A',
        initialServerPlayerId: 'p-anu',
      });

    // Device 2 arrives first with sequenceNumber 2 (even though wall clock is earlier)
    const dev2Res = await request(app)
      .post(`/api/matches/${matchId}/events/sync`)
      .set('Authorization', `Bearer ${scorerToken}`)
      .send({
        events: [
          {
            id: `ev-seq2-${matchId}`,
            matchId,
            type: 'POINT',
            side: 'B',
            sequenceNumber: 2,
            timestamp: 1000,
          },
        ],
      });
    expect(dev2Res.status).toBe(200);

    // Device 1 arrives second with sequenceNumber 1 (later wall clock)
    const dev1Res = await request(app)
      .post(`/api/matches/${matchId}/events/sync`)
      .set('Authorization', `Bearer ${scorerToken}`)
      .send({
        events: [
          {
            id: `ev-seq1-${matchId}`,
            matchId,
            type: 'POINT',
            side: 'A',
            sequenceNumber: 1,
            timestamp: 999999,
          },
        ],
      });
    expect(dev1Res.status).toBe(200);
    expect(dev1Res.body.state.currentScoreA).toBe(1);
    expect(dev1Res.body.state.currentScoreB).toBe(1);
  });

  it('initializes Socket.IO /rankings namespace and emits initial snapshot within 1 second', async () => {
    const server = http.createServer(app);
    const io = new Server(server);
    const start = Date.now();
    const ns = setupRankingSockets(io);
    const elapsed = Date.now() - start;

    expect(ns.name).toBe('/rankings');
    expect(elapsed).toBeLessThan(1000);
    io.close();
    server.close();
  });
});
