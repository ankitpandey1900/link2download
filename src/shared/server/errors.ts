export type ErrorCode =
  | "BAD_REQUEST"
  | "DRM_PROTECTED"
  | "EXTRACTION_FAILED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SSRF_BLOCKED"
  | "TIMEOUT"
  | "UPSTREAM_UNAVAILABLE";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("BAD_REQUEST", message, 400, details);
  }
}

export class DrmProtectedError extends AppError {
  constructor() {
    super("DRM_PROTECTED", "This content is DRM protected and cannot be downloaded.", 422);
  }
}

export function toAppError(error: unknown) {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.name === "AbortError") {
    return new AppError("TIMEOUT", "The upstream request timed out.", 504);
  }
  return new AppError("EXTRACTION_FAILED", "Unable to extract a downloadable video source.", 500);
}
