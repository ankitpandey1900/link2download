import { z } from "zod";

export const extractRequestSchema = z.object({
  url: z.url({ message: "Enter a valid webpage URL." })
});

export const downloadRequestSchema = z.object({
  extractionId: z.string().min(8),
  streamId: z.string().min(3)
});

export type ExtractRequestDto = z.infer<typeof extractRequestSchema>;
export type DownloadRequestDto = z.infer<typeof downloadRequestSchema>;
