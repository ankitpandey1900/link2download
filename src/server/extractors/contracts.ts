import type { ExtractionMetadata, VideoStream } from "@/features/extraction/types";

export type ExtractionContext = {
  requestId: string;
  sourceUrl: string;
  pageHtml?: string;
};

export type ExtractorOutcome = {
  metadata: ExtractionMetadata;
  streams: VideoStream[];
};

export interface VideoExtractor {
  readonly name: string;
  canHandle(context: ExtractionContext): boolean | Promise<boolean>;
  extract(context: ExtractionContext): Promise<ExtractorOutcome>;
}
