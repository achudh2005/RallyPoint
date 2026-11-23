import { Router, Request, Response } from 'express';

const router = Router();

// Sample players in memory
const samplePlayers = [
  {
    id: 'p-va',
    firstName: 'Viktor',
    lastName: 'Axelsen',
    displayName: 'Viktor Axelsen',
    nationality: 'DEN',
    dominantHand: 'RIGHT',
    status: 'ACTIVE',
    heightCm: 194,
    careerWins: 412,
    careerLosses: 85,
  },
  {
    id: 'p-lzj',
    firstName: 'Zii Jia',
    lastName: 'Lee',
    displayName: 'Lee Zii Jia',
    nationality: 'MAS',
    dominantHand: 'RIGHT',
    status: 'ACTIVE',
    heightCm: 186,
    careerWins: 278,
    careerLosses: 110,
  },
  {
    id: 'p-km',
    firstName: 'Kento',
    lastName: 'Momota',
    displayName: 'Kento Momota',
    nationality: 'JPN',
    dominantHand: 'LEFT',
    status: 'ACTIVE',
    heightCm: 175,
    careerWins: 389,
    careerLosses: 92,
  },
];

router.get('/', (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').toLowerCase();
  const filtered = samplePlayers.filter(
    (p) =>
      p.displayName.toLowerCase().includes(query) ||
      p.nationality.toLowerCase().includes(query)
  );
  res.json({ players: filtered, total: filtered.length });
});

router.get('/:id', (req: Request, res: Response) => {
  const player = samplePlayers.find((p) => p.id === req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  res.json({ player });
});

export default router;
