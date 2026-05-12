import type { ExtractionContext, VideoExtractor } from "@/server/extractors/contracts";
import { BrightPathExtractor } from "@/server/extractors/custom/brightpath-extractor";
import { DirectMediaExtractor } from "@/server/extractors/direct/direct-media-extractor";
import { GenericPageExtractor } from "@/server/extractors/generic/generic-page-extractor";
import { JwPlayerExtractor } from "@/server/extractors/jwplayer/jwplayer-extractor";
import { YtDlpExtractor } from "@/server/extractors/yt-dlp/yt-dlp-extractor";

export class ExtractorRegistry {
  constructor(private readonly extractors: VideoExtractor[]) {}

  async matching(context: ExtractionContext) {
    const matched: VideoExtractor[] = [];

    for (const extractor of this.extractors) {
      if (await extractor.canHandle(context)) matched.push(extractor);
    }

    return matched;
  }
}

export const extractorRegistry = new ExtractorRegistry([
  new DirectMediaExtractor(),
  new JwPlayerExtractor(),
  new BrightPathExtractor(),
  new GenericPageExtractor(),
  new YtDlpExtractor()
]);
