import { load } from "cheerio";
import { nanoid } from "nanoid";

import type { VideoStream, StreamContainer } from "@/features/extraction/types";
import { assertPageHasNoDrmSignals } from "@/server/extractors/drm";
import { parseDashManifest, parseHlsManifest } from "@/server/extractors/manifest";
import type { ExtractionContext, ExtractorOutcome, VideoExtractor } from "@/server/extractors/contracts";
import { fetchWithTimeout } from "@/shared/server/fetcher";

const streamPattern = /https?:\/\/[^"'\s<>]+?\.(?:m3u8|mpd|mp4|webm|avi|mkv)(?:\?[^"'\s<>]*)?/gi;
const jsonStreamPattern = /"url"\s*:\s*"([^"]+\.(?:m3u8|mpd|mp4)[^"]*)"/gi;

export class GenericPageExtractor implements VideoExtractor {
  readonly name = "generic";

  canHandle() {
    return true;
  }

  async extract(context: ExtractionContext): Promise<ExtractorOutcome> {
    const html = context.pageHtml ?? (await (await fetchWithTimeout(context.sourceUrl)).text());

    const $ = load(html);
    const candidates = new Set<string>();

    // 1. Standard tags
    $("video source, video, a, iframe, embed").each((_, element) => {
      const src = $(element).attr("src") ?? $(element).attr("href") ?? $(element).attr("data-src") ?? $(element).attr("data-video-url");
      if (src && !src.startsWith("javascript:")) {
        try {
          candidates.add(new URL(src, context.sourceUrl).toString());
        } catch { /* ignore invalid URLs */ }
      }
    });

    // 2. Regex on whole HTML (finds hidden URLs in scripts/JSON)
    const matches = [...html.matchAll(streamPattern), ...html.matchAll(jsonStreamPattern)];
    for (const match of matches) {
      const rawUrl = match[1] || match[0];
      const cleanUrl = rawUrl.replace(/\\/g, ""); // De-escape slashes
      try {
        candidates.add(new URL(cleanUrl, context.sourceUrl).toString());
      } catch { /* ignore */ }
    }

    // 3. Scan script content specifically
    $("script").each((_, element) => {
      const scriptContent = $(element).text();
      
      // 3a. Direct patterns
      if (/m3u8|mp4|mpd|webm/i.test(scriptContent)) {
        for (const match of scriptContent.matchAll(streamPattern)) {
          const cleanUrl = match[0].replace(/\\/g, "");
          try {
            candidates.add(new URL(cleanUrl, context.sourceUrl).toString());
          } catch { /* ignore */ }
        }
      }

      // 3b. Base64 patterns (very common in players)
      const base64Pattern = /(?:["'])([A-Za-z0-9+/]{20,}(?:={0,2}))(?:["'])/g;
      for (const match of scriptContent.matchAll(base64Pattern)) {
        try {
          const decoded = Buffer.from(match[1], "base64").toString("utf8");
          if (decoded.includes("http") && /m3u8|mp4|mpd|webm/i.test(decoded)) {
             for (const streamMatch of decoded.matchAll(streamPattern)) {
               candidates.add(new URL(streamMatch[0], context.sourceUrl).toString());
             }
          }
        } catch { /* not valid base64 or not a URL */ }
      }
    });

    const streams = await this.resolveStreams([...candidates], context.sourceUrl);

    return {
      metadata: {
        sourceUrl: context.sourceUrl,
        provider: new URL(context.sourceUrl).hostname,
        title: $("meta[property='og:title']").attr("content") ?? $("title").text().trim() ?? undefined,
        description: $("meta[property='og:description']").attr("content") ?? undefined,
        thumbnailUrl: $("meta[property='og:image']").attr("content")
      },
      streams
    };
  }

  private async resolveStreams(candidates: string[], baseUrl: string): Promise<VideoStream[]> {
    const streams: VideoStream[] = [];
    const normalizedCandidates = [...new Set(candidates.map(c => c.split("#")[0]))]; // Remove hashes
    
    const headers = { "Referer": baseUrl };

    for (const url of normalizedCandidates.slice(0, 30)) {
      try {
        if (url.includes(".m3u8")) {
          const manifest = await (await fetchWithTimeout(url)).text();
          streams.push(...parseHlsManifest(url, manifest, headers));
          continue;
        }

        if (url.includes(".mpd")) {
          const manifest = await (await fetchWithTimeout(url)).text();
          streams.push(...parseDashManifest(url, manifest, headers));
          continue;
        }

        const isMedia = [".mp4", ".webm", ".avi", ".mkv", ".mov", ".flv", ".ts"].some(ext => url.toLowerCase().includes(ext));
        if (isMedia) {
          const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase() || "mp4";
          const container: StreamContainer = ["mp4", "hls", "dash", "webm"].includes(ext) 
            ? (ext as StreamContainer) 
            : (ext === "m3u8" ? "hls" : ext === "mpd" ? "dash" : "other");

          streams.push({
            id: `gen_${nanoid(8)}`,
            url,
            container,
            mimeType: `video/${ext === "m3u8" ? "mp4" : ext}`,
            quality: "source",
            downloadable: true,
            headers
          });
        }
      } catch (error) {
        // Silently skip failed candidates
      }
    }

    return dedupeStreams(streams);
  }
}

function dedupeStreams(streams: VideoStream[]) {
  const seen = new Set<string>();
  return streams.filter((stream) => {
    const key = `${stream.container}:${stream.url}:${stream.quality ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
