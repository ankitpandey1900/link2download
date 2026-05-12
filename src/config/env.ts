import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3001"),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  EXTRACTION_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  ALLOWED_ORIGINS: z.string().optional()
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  EXTRACTION_TIMEOUT_MS: process.env.EXTRACTION_TIMEOUT_MS,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
});

export const allowedOrigins = env.ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()) ?? [];
