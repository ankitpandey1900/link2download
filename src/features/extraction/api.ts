import type { DownloadRequestDto, ExtractRequestDto } from "@/features/extraction/validation";
import type { ExtractResponse } from "@/features/extraction/types";

export async function extractVideo(payload: ExtractRequestDto): Promise<ExtractResponse> {
  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    return parseJsonEnvelope(response);
  } catch (error) {
    return {
      success: false,
      code: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "The extraction request could not be completed."
    };
  }
}

export async function createDownload(payload: DownloadRequestDto) {
  const response = await fetch("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return response.json();
}

async function parseJsonEnvelope(response: Response): Promise<ExtractResponse> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return {
      success: false,
      code: "UPSTREAM_UNAVAILABLE",
      message: `The server returned an unexpected ${response.status} response.`
    };
  }

  return response.json();
}
