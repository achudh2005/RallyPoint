import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getMatchEvents,
  getMatchState,
  registerMatch,
  syncMatchEvents,
} from '../services/eventSyncService.js';
import type { MatchConfig, MatchEvent } from '@rallypoint/engine';

const router = Router();

const createMatchSchema = z.object({
  id: z.string().optional(),
  mode: z.enum(['singles', 'doubles']),
  bestOf: z.number().default(3),
  pointsToWinGame: z.number().default(21),
  tiebreakCap: z.number().default(30),
  sideA: z.object({
    id: z.string(),
    name: z.string(),
    playerIds: z.array(z.string()),
  }),
  sideB: z.object({
    id: z.string(),
    name: z.string(),
    playerIds: z.array(z.string()),
  }),
  initialServerSide: z.enum(['A', 'B']).default('A'),
  initialServerPlayerId: z.string(),
  initialReceiverPlayerId: z.string().optional(),
});

const syncEventsSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      clientUuid: z.string().optional(),
      matchId: z.string(),
      timestamp: z.number(),
      type: z.enum([
        'POINT',
        'PLAYER_ACTION',
        'UNDO',
        'GAME_END',
        'MATCH_END',
        'SERVE_FAULT',
        'RETIRE',
        'WALKOVER',
        'INTERVAL',
      ]),
      side: z.enum(['A', 'B']).optional(),
      playerId: z.string().optional(),
      action: z.enum(['POINT', 'DROP']).optional(),
      resultingWinnerSide: z.enum(['A', 'B']).optional(),
      serverAtRally: z.string().optional(),
      servingSideAtRally: z.enum(['A', 'B']).optional(),
      isPoint: z.boolean().optional(),
      isSideOut: z.boolean().optional(),
      scoringFormat: z.string().optional(),
      occurredAt: z.string().optional(),
      deviceId: z.string().optional(),
      rallyEndType: z
        .enum([
          'SMASH',
          'DROP',
          'NET',
          'OUT',
          'UNFORCED_ERROR',
          'SERVICE_FAULT',
          'WINNER',
        ])
        .optional(),
      faultySide: z.enum(['A', 'B']).optional(),
      retiringSide: z.enum(['A', 'B']).optional(),
      concedingSide: z.enum(['A', 'B']).optional(),
      intervalType: z.enum(['ELEVEN_POINT', 'GAME_BREAK']).optional(),
      gameNumber: z.number().optional(),
    })
  ),
});

// Create match (Scorer or Admin or Umpire)
router.post(
  '/',
  authenticate,
  authorize(['ADMIN', 'SCORER', 'UMPIRE']),
  validate(createMatchSchema),
  (req: AuthRequest, res: Response) => {
    const id = req.body.id ?? `match-${Date.now()}`;
    const config: MatchConfig = {
      ...req.body,
      id,
    };

    const state = registerMatch(config);
    res.status(201).json({ matchId: id, state });
  }
);

// Get match state (Public or Authenticated)
router.get('/:id', (req: Request, res: Response) => {
  const matchId = req.params.id ?? '';
  const state = getMatchState(matchId);
  if (!state) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }
  const events = getMatchEvents(matchId);
  res.json({ state, events });
});

// Public Big-Screen TV Scoreboard Endpoint
router.get('/:id/live', (req: Request, res: Response) => {
  const matchId = req.params.id ?? '';
  const state = getMatchState(matchId);
  if (!state) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  res.json({
    live: true,
    matchId: state.config.id,
    mode: state.config.mode,
    status: state.status,
    currentGame: state.currentGameNumber,
    gamesWonA: state.gamesWonA,
    gamesWonB: state.gamesWonB,
    currentScoreA: state.currentScoreA,
    currentScoreB: state.currentScoreB,
    nameA: state.config.sideA.name,
    nameB: state.config.sideB.name,
    serveState: state.serveState,
    winnerSide: state.winnerSide,
    spectators: 1, // TV connection
  });
});

// Batch events endpoint (Scorer, Umpire, Admin)
router.post(
  '/:id/events',
  authenticate,
  authorize(['ADMIN', 'SCORER', 'UMPIRE']),
  validate(syncEventsSchema),
  (req: AuthRequest, res: Response) => {
    const matchId = req.params.id ?? '';
    try {
      const result = syncMatchEvents(matchId, req.body.events as MatchEvent[]);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }
);

// Sync offline events (Scorer, Umpire can override, Admin)
router.post(
  '/:id/events/sync',
  authenticate,
  authorize(['ADMIN', 'SCORER', 'UMPIRE']),
  validate(syncEventsSchema),
  (req: AuthRequest, res: Response) => {
    const matchId = req.params.id ?? '';
    try {
      const result = syncMatchEvents(matchId, req.body.events as MatchEvent[]);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }
);

export default router;
