import { load } from "cheerio";

import type { ExtractionContext, ExtractorOutcome, VideoExtractor } from "@/server/extractors/contracts";
import { GenericPageExtractor } from "@/server/extractors/generic/generic-page-extractor";

export class JwPlayerExtractor implements VideoExtractor {
  readonly name = "jwplayer";
  private readonly generic = new GenericPageExtractor();

  canHandle(context: ExtractionContext) {
    return Boolean(context.pageHtml?.toLowerCase().includes("jwplayer"));
  }

  async extract(context: ExtractionContext): Promise<ExtractorOutcome> {
    const genericOutcome = await this.generic.extract(context);
    const $ = load(context.pageHtml ?? "");
    const title = $("meta[property='og:title']").attr("content") ?? genericOutcome.metadata.title;

    return {
      metadata: { ...genericOutcome.metadata, provider: "jwplayer", title },
      streams: genericOutcome.streams
    };
  }
}
