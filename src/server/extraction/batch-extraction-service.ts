import { nanoid } from "nanoid";
import { BrightPathExtractor } from "@/server/extractors/custom/brightpath-extractor";
import { fetchWithTimeout } from "@/shared/server/fetcher";
import type { Episode, VideoStream } from "@/features/extraction/types";
import { logger } from "@/shared/server/logger";

export class BatchExtractionService {
    private readonly brightPath = new BrightPathExtractor();

    async discoverEpisodes(imdbId: string, type: "tv" | "movie"): Promise<Episode[]> {
        if (type !== "tv") return [];

        const episodes: Episode[] = [];
        let season = 1;
        let consecutiveFailures = 0;

        // Limit to 20 seasons and 100 episodes per season to prevent infinite loops
        while (season <= 20) {
            let episode = 1;
            let foundInSeason = 0;
            
            // We check episodes sequentially for now to be safe with rate limits
            // but we could parallelize this later
            while (episode <= 100) {
                try {
                    const result = await this.brightPath.extractEpisode(imdbId, season.toString(), episode.toString(), type);
                    if (result && result.streams.length > 0) {
                        episodes.push({
                            id: nanoid(8),
                            season,
                            number: episode,
                            title: result.metadata.title,
                            streams: result.streams
                        });
                        foundInSeason++;
                        episode++;
                    } else {
                        break; // End of season
                    }
                } catch (err) {
                    logger.error({ err, season, episode }, "Batch extraction episode failure");
                    break; // End of season or error
                }
            }

            if (foundInSeason === 0) {
                break; // No more seasons
            }
            season++;
        }

        return episodes;
    }
}

export const batchExtractionService = new BatchExtractionService();
