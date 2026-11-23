import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z
    .string()
    .default('postgresql://rallypoint:rallypoint_secret@localhost:5432/rallypoint_db?schema=public'),
  JWT_ACCESS_SECRET: z.string().default('rallypoint_access_secret_key_development_only'),
  JWT_REFRESH_SECRET: z.string().default('rallypoint_refresh_secret_key_development_only'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
