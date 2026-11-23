import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  verifyRefreshToken,
} from '../utils/auth.js';

const router = Router();

// In-memory user store for demonstration & testing
interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'SCORER' | 'PLAYER' | 'VIEWER' | 'UMPIRE';
}

export const usersDb = new Map<string, UserRecord>();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'SCORER', 'PLAYER', 'VIEWER', 'UMPIRE']).default('VIEWER'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  if (usersDb.has(email.toLowerCase())) {
    res.status(409).json({ error: 'User already exists' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user: UserRecord = {
    id: `user-${Date.now()}`,
    email: email.toLowerCase(),
    passwordHash,
    role,
  };

  usersDb.set(email.toLowerCase(), user);

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.status(201).json({
    user: { id: user.id, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  });
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = usersDb.get(email.toLowerCase());
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.json({
    user: { id: user.id, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  });
});

router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  try {
    const payload = verifyRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });
    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

export default router;
