import { env } from "@/config/env";
import { AppError } from "@/shared/server/errors";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function assertRateLimit(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + env.RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (bucket.count >= env.RATE_LIMIT_MAX) {
    throw new AppError("RATE_LIMITED", "Too many extraction requests. Please slow down.", 429);
  }

  bucket.count += 1;
}
