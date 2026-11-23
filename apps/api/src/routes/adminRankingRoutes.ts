import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import {
  rebuildAllRankings,
  recalculateStreaks,
  getAuditLog,
  runDailyRollup,
} from '../services/rankingService.js';

export const adminRankingRoutes = Router();

// Protect all admin ranking endpoints with JWT and ADMIN role
adminRankingRoutes.use(authenticate, authorize(['ADMIN']));

// POST /api/admin/rebuild-rankings
adminRankingRoutes.post('/rebuild-rankings', (req: AuthRequest, res: Response) => {
  const { seasonId } = req.body || {};
  const performedBy = req.user?.email || 'ADMIN';
  const result = rebuildAllRankings(seasonId, performedBy);
  res.json(result);
});

// POST /api/admin/recalculate-streaks
adminRankingRoutes.post('/recalculate-streaks', (req: AuthRequest, res: Response) => {
  const performedBy = req.user?.email || 'ADMIN';
  const result = recalculateStreaks(performedBy);
  res.json(result);
});

// GET /api/admin/audit-log
adminRankingRoutes.get('/audit-log', (_req: AuthRequest, res: Response) => {
  const logs = getAuditLog();
  res.json({ logs, total: logs.length });
});

// POST /api/admin/daily-rollup
adminRankingRoutes.post('/daily-rollup', (req: AuthRequest, res: Response) => {
  const performedBy = req.user?.email || 'ADMIN';
  const result = runDailyRollup(performedBy);
  res.json(result);
});

export default adminRankingRoutes;
