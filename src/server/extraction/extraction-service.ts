import { nanoid } from "nanoid";

import type { ExtractionResult, VideoStream } from "@/features/extraction/types";
import { extractorRegistry, type ExtractorRegistry } from "@/server/extractors/registry";
import { assertPageHasNoDrmSignals } from "@/server/extractors/drm";
import { extractionRepository, type ExtractionRepository } from "@/server/repositories/extraction-repository";
import { assertPublicHttpUrl } from "@/shared/server/ssrf";
import { fetchWithTimeout } from "@/shared/server/fetcher";
import { AppError } from "@/shared/server/errors";
import { logger } from "@/shared/server/logger";

const directMediaPattern = /\.(mp4|m3u8|mpd)(?:$|\?)/i;

export class ExtractionService {
  constructor(
    private readonly registry: ExtractorRegistry,
    private readonly repository: ExtractionRepository
  ) {}

  async extract(rawUrl: string, requestId: string): Promise<ExtractionResult> {
    const url = await assertPublicHttpUrl(rawUrl);
    const cached = await this.repository.findByUrl(url);
    if (cached) return cached;

    const pageHtml = directMediaPattern.test(url) ? undefined : await this.loadPageHtml(url);
    if (pageHtml) assertPageHasNoDrmSignals(pageHtml);

    const context = { requestId, sourceUrl: url, pageHtml };
    const extractors = await this.registry.matching(context);
    const failures: string[] = [];

    for (const extractor of extractors) {
      try {
        const outcome = await extractor.extract(context);
        const streams = normalizeStreams(outcome.streams);
        if (streams.length === 0) {
          failures.push(`${extractor.name}: no streams`);
          continue;
        }

        const result: ExtractionResult = {
          id: nanoid(14),
          url,
          status: "completed",
          metadata: outcome.metadata,
          streams,
          createdAt: new Date().toISOString()
        };

        await this.repository.save(result);
        return result;
      } catch (error) {
        failures.push(`${extractor.name}: ${error instanceof Error ? error.message : "unknown error"}`);
        logger.info({ requestId, extractor: extractor.name, err: error }, "extractor fallback");
      }
    }

    throw new AppError("EXTRACTION_FAILED", "No public downloadable stream was found on this page.", 422, {
      failures
    });
  }

  async get(id: string) {
    return this.repository.findById(id);
  }

  async history() {
    return this.repository.history();
  }

  private async loadPageHtml(url: string) {
    const pageResponse = await fetchWithTimeout(url);
    if (!pageResponse.ok) {
      throw new AppError("UPSTREAM_UNAVAILABLE", "The target page could not be loaded.", 502);
    }

    return pageResponse.text();
  }
}

function normalizeStreams(streams: VideoStream[]) {
  return streams
    .filter((stream) => stream.url && stream.downloadable)
    .filter((stream, index, all) => all.findIndex((item) => item.url === stream.url && item.quality === stream.quality) === index)
    .slice(0, 16);
}

export const extractionService = new ExtractionService(extractorRegistry, extractionRepository);
