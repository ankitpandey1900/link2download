import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { nanoid } from "nanoid";

import type { VideoStream } from "@/features/extraction/types";
import type { ExtractionContext, ExtractorOutcome, VideoExtractor } from "@/server/extractors/contracts";
import { AppError } from "@/shared/server/errors";

const execFileAsync = promisify(execFile);

type YtDlpFormat = {
  format_id?: string;
  url?: string;
  ext?: string;
  height?: number;
  width?: number;
  format_note?: string;
  filesize?: number;
  filesize_approx?: number;
  tbr?: number;
  vcodec?: string;
  acodec?: string;
};

type YtDlpPayload = {
  title?: string;
  thumbnail?: string;
  duration?: number;
  webpage_url?: string;
  extractor_key?: string;
  formats?: YtDlpFormat[];
};

export class YtDlpExtractor implements VideoExtractor {
  readonly name = "yt-dlp";

  canHandle() {
    return true;
  }

  async extract(context: ExtractionContext): Promise<ExtractorOutcome> {
    const commands = [
      { cmd: "yt-dlp", args: [] },
      { cmd: "python", args: ["-m", "yt_dlp"] }
    ];

    let stdout: string = "";
    let lastError: any;

    for (const { cmd, args } of commands) {
      try {
        const fullArgs = [
          ...args,
          "--dump-single-json",
          "--no-playlist",
          "--no-check-certificates",
          "--format", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
          "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          context.sourceUrl
        ];
        
        const result = await execFileAsync(cmd, fullArgs, {
          timeout: 30000,
          maxBuffer: 1024 * 1024 * 12
        });
        
        stdout = result.stdout;
        if (stdout.trim()) break;
      } catch (error) {
        lastError = error;
        continue;
      }
    }

    if (!stdout.trim()) {
      throw new AppError("UPSTREAM_UNAVAILABLE", getYtDlpMessage(lastError), 502, {
        cause: lastError instanceof Error ? lastError.message : "unknown"
      });
    }

    const payload = parsePayload(stdout);
    const streams = (payload.formats ?? [])
      .filter((format) => format.url && ["mp4", "m3u8", "mpd"].some((ext) => format.ext?.includes(ext) || format.url?.includes(`.${ext}`)))
      .slice(0, 20)
      .map(toStream);

    return {
      metadata: {
        sourceUrl: payload.webpage_url ?? context.sourceUrl,
        provider: payload.extractor_key ?? new URL(context.sourceUrl).hostname,
        title: payload.title,
        thumbnailUrl: payload.thumbnail,
        durationSeconds: payload.duration
      },
      streams
    };
  }
}

function parsePayload(stdout: string): YtDlpPayload {
  try {
    // Handle cases where yt-dlp might return multiple JSON objects (one per line)
    const lines = stdout.trim().split("\n");
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === "object") {
          return parsed as YtDlpPayload;
        }
      } catch {
        continue;
      }
    }
    
    return {} as YtDlpPayload;
  } catch {
    throw new AppError("UPSTREAM_UNAVAILABLE", "yt-dlp returned an invalid response.", 502);
  }
}

function getYtDlpMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  if (code === "ENOENT" || message.toLowerCase().includes("not recognized")) {
    return "yt-dlp is not installed or is not available on the server PATH.";
  }

  return "yt-dlp could not extract this URL. The source may be protected, unavailable, or unsupported.";
}

function toStream(format: YtDlpFormat): VideoStream {
  const container = format.url?.includes(".m3u8") ? "hls" : format.url?.includes(".mpd") ? "dash" : "mp4";
  return {
    id: format.format_id ? `ytdlp_${format.format_id}` : `ytdlp_${nanoid(8)}`,
    url: format.url ?? "",
    container,
    quality: format.height ? `${format.height}p` : format.format_note,
    width: format.width,
    height: format.height,
    bandwidth: format.tbr ? Math.round(format.tbr * 1000) : undefined,
    codecs: [format.vcodec, format.acodec].filter(Boolean).join(", ") || undefined,
    sizeBytes: format.filesize ?? format.filesize_approx,
    downloadable: true
  };
}
