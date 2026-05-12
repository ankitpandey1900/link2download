import { Queue } from "bullmq";

import { getRedis } from "@/infrastructure/redis/connection";

export type ExtractionJob = {
  url: string;
  requestId: string;
};

const connection = getRedis();

export const extractionQueue = connection
  ? new Queue<ExtractionJob>("extractions", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 500,
        removeOnFail: 1000
      }
    })
  : undefined;
