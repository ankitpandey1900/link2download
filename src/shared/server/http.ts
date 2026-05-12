import { NextResponse, type NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { ZodError, type ZodType } from "zod";

import { allowedOrigins } from "@/config/env";
import { AppError, toAppError, ValidationError } from "@/shared/server/errors";
import { logger } from "@/shared/server/logger";

type Handler<T> = (request: NextRequest, context: T & { requestId: string }) => Promise<Response>;
type StaticHandler = (request: NextRequest, context: { requestId: string }) => Promise<Response>;

const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; media-src 'self' https: http: blob:; img-src 'self' https: data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https: http:;",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Permitted-Cross-Domain-Policies": "none"
};

export function withApiHandler(handler: StaticHandler) {
  return async (request: NextRequest) => {
    const requestId = request.headers.get("x-request-id") ?? nanoid(12);

    try {
      const response = await handler(request, { requestId });
      return withHeaders(response, request, requestId);
    } catch (error) {
      const appError = error instanceof ZodError ? new ValidationError("Invalid request payload.", error.flatten()) : toAppError(error);

      logger.warn({ err: appError, requestId }, "request failed");

      const response = NextResponse.json(
        {
          success: false,
          code: appError.code,
          message: appError.message,
          requestId,
          details: appError.details
        },
        { status: appError.statusCode }
      );

      return withHeaders(response, request, requestId);
    }
  };
}

export function withRouteApiHandler<T extends object>(handler: Handler<T>) {
  return async (request: NextRequest, context: T) => {
    const requestId = request.headers.get("x-request-id") ?? nanoid(12);

    try {
      const response = await handler(request, { ...context, requestId });
      return withHeaders(response, request, requestId);
    } catch (error) {
      const appError = error instanceof ZodError ? new ValidationError("Invalid request payload.", error.flatten()) : toAppError(error);

      logger.warn({ err: appError, requestId }, "request failed");

      const response = NextResponse.json(
        {
          success: false,
          code: appError.code,
          message: appError.message,
          requestId,
          details: appError.details
        },
        { status: appError.statusCode }
      );

      return withHeaders(response, request, requestId);
    }
  };
}

export async function parseJson<T>(request: NextRequest, schema: ZodType<T>) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }
  return schema.parse(body);
}

function withHeaders(response: Response, request: NextRequest, requestId: string) {
  const origin = request.headers.get("origin");
  const headers = new Headers(response.headers);

  Object.entries(securityHeaders).forEach(([key, value]) => headers.set(key, value));
  headers.set("X-Request-Id", requestId);

  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Request-Id");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export const optionsResponse = (request: NextRequest) =>
  withHeaders(new Response(null, { status: 204 }), request, nanoid(12));

export function notFound(message = "Resource not found.") {
  throw new AppError("NOT_FOUND", message, 404);
}
