import { nanoid } from "nanoid";

import { downloadRequestSchema, type DownloadRequestDto } from "@/features/extraction/validation";
import { extractionRepository } from "@/server/repositories/extraction-repository";
import { AppError } from "@/shared/server/errors";

export class DownloadService {
  async create(payload: DownloadRequestDto) {
    const dto = downloadRequestSchema.parse(payload);
    const extraction = await extractionRepository.findById(dto.extractionId);

    if (!extraction) {
      throw new AppError("NOT_FOUND", "Extraction was not found.", 404);
    }

    const stream = extraction.streams.find((item) => item.id === dto.streamId);
    if (!stream) {
      throw new AppError("NOT_FOUND", "Stream was not found.", 404);
    }

    return {
      id: nanoid(14),
      extractionId: extraction.id,
      streamId: stream.id,
      url: stream.url,
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString()
    };
  }
}

export const downloadService = new DownloadService();
