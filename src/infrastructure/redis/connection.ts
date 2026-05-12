import IORedis from "ioredis";

import { env } from "@/config/env";

let redis: IORedis | undefined;

export function getRedis() {
  if (!env.REDIS_URL) return undefined;
  redis ??= new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return redis;
}
