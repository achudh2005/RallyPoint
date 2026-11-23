import { Router, Request, Response } from 'express';
import { RankingCategory } from '@rallypoint/ranking';
import {
  getLeaderboard,
  getPlayerDetailedStats,
  getHeadToHead,
  getTeamLeaderboards,
} from '../services/rankingService.js';

export const rankingRoutes = Router();

// GET /api/rankings/head-to-head?player1=&player2=
rankingRoutes.get('/head-to-head', (req: Request, res: Response) => {
  const { player1, player2 } = req.query;
  if (!player1 || !player2 || typeof player1 !== 'string' || typeof player2 !== 'string') {
    res.status(400).json({ error: 'player1 and player2 query parameters are required' });
    return;
  }
  const h2h = getHeadToHead(player1, player2);
  res.json(h2h);
});

// GET /api/rankings/player/:id
rankingRoutes.get('/player/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'Player ID parameter is required' });
    return;
  }
  const playerStats = getPlayerDetailedStats(id);
  if (!playerStats) {
    res.status(404).json({ error: 'Player not found in community rankings' });
    return;
  }
  res.json(playerStats);
});

// GET /api/rankings/teams/rankings or /api/teams/rankings or /teams/rankings
rankingRoutes.get(['/teams/rankings', '/teams', '/rankings'], (_req: Request, res: Response) => {
  const teams = getTeamLeaderboards();
  res.json(teams);
});

// GET /api/rankings/:category?season=&timeframe=&minMatches=&page=&limit=
rankingRoutes.get('/:category', (req: Request, res: Response) => {
  const { category } = req.params;
  if (!category) {
    res.status(400).json({ error: 'Ranking category is required' });
    return;
  }
  const { season, timeframe, minMatches, page, limit } = req.query;

  const validCategories: RankingCategory[] = [
    'OVERALL',
    'MOST_WINS',
    'MOST_POINTS',
    'MOST_LOSSES',
    'MOST_DROPS_PLAYED',
    'MOST_DROPS_CONCEDED',
    'MOST_UNFORCED_ERRORS',
    'BEST_WIN_RATE',
  ];

  const matchedCategory = validCategories.find(
    (c) => c.toLowerCase() === category.toLowerCase()
  );

  if (!matchedCategory) {
    res.status(400).json({
      error: `Invalid ranking category. Valid categories: ${validCategories.join(', ')}`,
    });
    return;
  }

  const result = getLeaderboard(matchedCategory, {
    season: typeof season === 'string' ? season : undefined,
    timeframe: typeof timeframe === 'string' ? timeframe : undefined,
    minMatches: minMatches ? Number(minMatches) : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });

  res.setHeader('Cache-Control', 'public, max-age=5');
  res.json(result);
});

export default rankingRoutes;
