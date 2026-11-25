import { Router, Request, Response } from 'express';

export interface ApiPlayer {
  id: string;
  displayName: string;
  nickname?: string;
  photoDataUrl?: string;
  phone?: string;
  note?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'HIDDEN';
  createdAt: string;
  archivedAt?: string;
}

const router = Router();

// In-memory store starts empty on fresh install
const players: ApiPlayer[] = [];

router.get('/', (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').toLowerCase();
  const includeArchived = req.query.includeArchived === 'true';
  const filtered = players.filter((p) => {
    if (!includeArchived && p.status !== 'ACTIVE') return false;
    return (
      p.displayName.toLowerCase().includes(query) ||
      (p.nickname && p.nickname.toLowerCase().includes(query))
    );
  });
  res.json({ players: filtered, total: filtered.length });
});

router.post('/', (req: Request, res: Response) => {
  const role = req.headers['x-user-role'] as string | undefined;
  if (role === 'PLAYER' || role === 'VIEWER') {
    res.status(403).json({ error: 'Only ADMIN or SCORER can add players' });
    return;
  }

  const rawName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
  if (rawName.length < 2 || rawName.length > 30) {
    res.status(400).json({ error: 'Player name must be between 2 and 30 characters' });
    return;
  }

  const duplicate = players.find(
    (p) => p.displayName.toLowerCase() === rawName.toLowerCase()
  );
  if (duplicate) {
    res.status(409).json({ error: 'A player with this name already exists' });
    return;
  }

  const id = typeof req.body?.id === 'string' && req.body.id.trim()
    ? req.body.id.trim()
    : `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const existingById = players.find((p) => p.id === id);
  if (existingById) {
    res.status(200).json({ player: existingById });
    return;
  }

  const newPlayer: ApiPlayer = {
    id,
    displayName: rawName,
    nickname: typeof req.body?.nickname === 'string' ? req.body.nickname.trim() || undefined : undefined,
    photoDataUrl: typeof req.body?.photoDataUrl === 'string' ? req.body.photoDataUrl : undefined,
    phone: typeof req.body?.phone === 'string' ? req.body.phone.trim() || undefined : undefined,
    note: typeof req.body?.note === 'string' ? req.body.note.trim() || undefined : undefined,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  players.unshift(newPlayer);
  res.status(201).json({ player: newPlayer });
});

router.patch('/:id', (req: Request, res: Response) => {
  const role = req.headers['x-user-role'] as string | undefined;
  if (role === 'PLAYER' || role === 'VIEWER') {
    res.status(403).json({ error: 'Only ADMIN or SCORER can edit players' });
    return;
  }

  const player = players.find((p) => p.id === req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  if (typeof req.body?.displayName === 'string') {
    const trimmed = req.body.displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      res.status(400).json({ error: 'Player name must be between 2 and 30 characters' });
      return;
    }
    player.displayName = trimmed;
  }
  if (req.body?.nickname !== undefined) {
    player.nickname = typeof req.body.nickname === 'string' ? req.body.nickname.trim() || undefined : undefined;
  }
  if (req.body?.photoDataUrl !== undefined) {
    player.photoDataUrl = typeof req.body.photoDataUrl === 'string' ? req.body.photoDataUrl : undefined;
  }
  if (req.body?.status === 'ACTIVE' || req.body?.status === 'ARCHIVED' || req.body?.status === 'HIDDEN') {
    player.status = req.body.status;
    player.archivedAt = req.body.status === 'ACTIVE' ? undefined : new Date().toISOString();
  }

  res.json({ player });
});

router.delete('/:id', (req: Request, res: Response) => {
  const role = req.headers['x-user-role'] as string | undefined;
  if (role === 'PLAYER' || role === 'VIEWER') {
    res.status(403).json({ error: 'Only ADMIN or SCORER can remove players' });
    return;
  }

  const idx = players.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  const [removed] = players.splice(idx, 1);
  res.json({ deleted: true, player: removed });
});

router.get('/:id', (req: Request, res: Response) => {
  const player = players.find((p) => p.id === req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  res.json({ player });
});

export default router;
