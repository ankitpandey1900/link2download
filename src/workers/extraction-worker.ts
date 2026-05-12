import { Worker } from "bullmq";

import { getRedis } from "@/infrastructure/redis/connection";
import { extractionService } from "@/server/extraction/extraction-service";
import { logger } from "@/shared/server/logger";

const connection = getRedis();

export const extractionWorker = connection
  ? new Worker(
      "extractions",
      async (job) => extractionService.extract(job.data.url, job.data.requestId),
      { connection, concurrency: 4 }
    )
  : undefined;

extractionWorker?.on("failed", (job, error) => {
  logger.warn({ jobId: job?.id, err: error }, "extraction job failed");
});
