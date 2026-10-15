import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGIN: z.string().default('*'),
  JWT_ACCESS_SECRET: z.string().min(16).default('development_jwt_access_secret_key_minimum_length_required'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development_jwt_refresh_secret_key_minimum_length_required'),
  JWT_ACCESS_EXPIRES_IN: z.coerce.number().default(900), // 15 minutes
  JWT_REFRESH_EXPIRES_IN: z.coerce.number().default(604800), // 7 days
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
