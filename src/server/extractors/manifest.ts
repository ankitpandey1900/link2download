import { nanoid } from "nanoid";

import type { StreamContainer, VideoStream } from "@/features/extraction/types";
import { assertNoDrmSignals } from "@/server/extractors/drm";

export function parseHlsManifest(manifestUrl: string, manifest: string, headers?: Record<string, string>): VideoStream[] {
  assertNoDrmSignals(manifest);

  const lines = manifest.split(/\r?\n/);
  const streams: VideoStream[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("#EXT-X-STREAM-INF")) continue;

    const attrs = parseAttributes(line.slice(line.indexOf(":") + 1));
    const next = lines.slice(index + 1).find((candidate) => candidate && !candidate.startsWith("#"));
    if (!next) continue;

    const [width, height] = attrs.RESOLUTION?.split("x").map(Number) ?? [];
    streams.push({
      id: `hls_${nanoid(8)}`,
      url: new URL(next, manifestUrl).toString(),
      container: "hls",
      mimeType: "application/vnd.apple.mpegurl",
      quality: height ? `${height}p` : undefined,
      width,
      height,
      bandwidth: attrs.BANDWIDTH ? Number(attrs.BANDWIDTH) : undefined,
      codecs: attrs.CODECS,
      downloadable: true,
      headers
    });
  }

  if (streams.length === 0) {
    streams.push({
      id: `hls_${nanoid(8)}`,
      url: manifestUrl,
      container: "hls",
      mimeType: "application/vnd.apple.mpegurl",
      quality: "adaptive",
      downloadable: true,
      headers
    });
  }

  return streams;
}

export function parseDashManifest(manifestUrl: string, manifest: string, headers?: Record<string, string>): VideoStream[] {
  assertNoDrmSignals(manifest);

  const representations = [...manifest.matchAll(/<Representation\b([^>]*)>/gi)];
  if (representations.length === 0) {
    return [createManifestStream("dash", manifestUrl, "adaptive", headers)];
  }

  return representations.slice(0, 12).map((match) => {
    const attrs = parseXmlAttributes(match[1] ?? "");
    const height = attrs.height ? Number(attrs.height) : undefined;
    return {
      id: `dash_${nanoid(8)}`,
      url: manifestUrl,
      container: "dash",
      mimeType: "application/dash+xml",
      quality: height ? `${height}p` : attrs.bandwidth ? `${Math.round(Number(attrs.bandwidth) / 1000)} kbps` : "adaptive",
      width: attrs.width ? Number(attrs.width) : undefined,
      height,
      bandwidth: attrs.bandwidth ? Number(attrs.bandwidth) : undefined,
      codecs: attrs.codecs,
      downloadable: true,
      headers
    };
  });
}

function createManifestStream(container: StreamContainer, url: string, quality: string, headers?: Record<string, string>): VideoStream {
  return {
    id: `${container}_${nanoid(8)}`,
    url,
    container,
    mimeType: container === "hls" ? "application/vnd.apple.mpegurl" : "application/dash+xml",
    quality,
    downloadable: true,
    headers
  };
}

function parseAttributes(value: string) {
  return Object.fromEntries(
    [...value.matchAll(/([A-Z-]+)=("[^"]+"|[^,]+)/g)].map(([, key, raw]) => [
      key,
      raw?.replace(/^"|"$/g, "")
    ])
  ) as Record<string, string>;
}

function parseXmlAttributes(value: string) {
  return Object.fromEntries(
    [...value.matchAll(/([\w:-]+)=["']([^"']+)["']/g)].map(([, key, raw]) => [key, raw])
  ) as Record<string, string>;
}
