import { nanoid } from "nanoid";

import type { VideoStream } from "@/features/extraction/types";
import type { ExtractionContext, ExtractorOutcome, VideoExtractor } from "@/server/extractors/contracts";
import { parseDashManifest, parseHlsManifest } from "@/server/extractors/manifest";
import { fetchWithTimeout } from "@/shared/server/fetcher";

const mediaExtensions = [".mp4", ".m3u8", ".mpd"];

export class DirectMediaExtractor implements VideoExtractor {
  readonly name = "direct-media";

  canHandle(context: ExtractionContext) {
    const pathname = new URL(context.sourceUrl).pathname.toLowerCase();
    return mediaExtensions.some((extension) => pathname.endsWith(extension));
  }

  async extract(context: ExtractionContext): Promise<ExtractorOutcome> {
    const url = new URL(context.sourceUrl);
    const streams = await this.resolveDirectStream(context.sourceUrl);

    return {
      metadata: {
        sourceUrl: context.sourceUrl,
        provider: url.hostname,
        title: decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "Direct media source")
      },
      streams
    };
  }

  private async resolveDirectStream(url: string): Promise<VideoStream[]> {
    const pathname = new URL(url).pathname.toLowerCase();

    if (pathname.endsWith(".m3u8")) {
      const manifest = await (await fetchWithTimeout(url)).text();
      return parseHlsManifest(url, manifest);
    }

    if (pathname.endsWith(".mpd")) {
      const manifest = await (await fetchWithTimeout(url)).text();
      return parseDashManifest(url, manifest);
    }

    return [
      {
        id: `mp4_${nanoid(8)}`,
        url,
        container: "mp4",
        mimeType: "video/mp4",
        quality: "source",
        downloadable: true
      }
    ];
  }
}
