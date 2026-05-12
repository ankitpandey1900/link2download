export type StreamContainer = "mp4" | "hls" | "dash" | "webm" | "other";

export type VideoStream = {
  id: string;
  url: string;
  container: StreamContainer;
  mimeType?: string;
  quality?: string;
  width?: number;
  height?: number;
  bandwidth?: number;
  codecs?: string;
  sizeBytes?: number;
  downloadable: boolean;
  headers?: Record<string, string>;
};

export type Episode = {
  id: string;
  season: number;
  number: number;
  title?: string;
  streams: VideoStream[];
};

export type ExtractionMetadata = {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  sourceUrl: string;
  provider: string;
  durationSeconds?: number;
  episodes?: Episode[];
};

export type ExtractionResult = {
  id: string;
  url: string;
  status: "completed" | "failed";
  metadata: ExtractionMetadata;
  streams: VideoStream[];
  createdAt: string;
};

export type ExtractResponse =
  | { success: true; data: ExtractionResult; requestId: string }
  | { success: false; code: string; message: string; requestId?: string; details?: unknown };
