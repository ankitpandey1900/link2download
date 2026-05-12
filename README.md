# Link2Download

Link2Download extracts downloadable video stream URLs from webpages or direct media URLs and returns normalized download entries for MP4, HLS, and DASH sources. It explicitly rejects DRM-protected media and does not attempt to bypass access controls.

## Architecture

The app uses Next.js App Router for the product UI and REST route handlers. Business logic lives outside route files:

- `src/features/extraction`: UI, hooks, DTOs, client API calls, and feature state.
- `src/server/extractors`: extractor contracts, registry, DRM checks, direct media extraction, HLS/DASH parsing, generic HTML extraction, JW Player detection, and `yt-dlp` adapter.
- `src/server/extraction`: application service that validates URLs, resolves pages, executes extractors, normalizes streams, and stores results.
- `src/server/repositories`: persistence contracts with Prisma-backed production storage and local/test fallback.
- `src/infrastructure`: Prisma, Redis, and BullMQ wiring.
- `src/shared`: UI primitives, request handling, errors, logging, SSRF protection, and rate limiting.

Routes are intentionally thin. They validate DTOs, apply request controls, and call services.

## Engineering Decisions

- **Plugin extraction model:** extractors implement a common contract and are selected through a registry. Provider-specific extractors can be added without changing route handlers.
- **Direct media support:** direct `.mp4`, `.m3u8`, and `.mpd` URLs are handled before webpage extraction.
- **DRM boundary:** Widevine, FairPlay, PlayReady, encrypted manifest markers, and EME usage produce `DRM_PROTECTED`.
- **SSRF protection:** only HTTP(S) URLs are accepted, DNS resolution is checked, and non-public IP ranges are blocked.
- **Typed configuration:** environment variables are parsed with Zod at startup.
- **Persistence:** Prisma/PostgreSQL is used when `DATABASE_URL` is configured. Tests and lightweight local runs can use the in-memory repository.
- **Queues:** BullMQ is wired for asynchronous extraction workloads when `REDIS_URL` is present.
- **TV Series Discovery:** Advanced crawling logic identifies episodes and seasons for supported providers, enabling bulk extraction and deep scanning.

## Key Features

- **Universal Engine**: Auto-detects HLS, DASH, and direct MP4 streams from any URL.
- **Header Propagation**: Custom proxy system that bypasses CDN blocks (Cloudflare, etc.) by mimicking browser behavior and propagating essential headers.
- **Deep Scan Series**: Automates the discovery of entire TV series, providing individual episode access and bulk link export.
- **Professional Downloader**: FFmpeg-powered stable downloading for high-quality streams.

## Setup

```bash
npm install
npm run prisma:generate
cp .env.example .env
npm run dev
```

Install media tools on the host or container image:

```bash
yt-dlp --version
ffmpeg -version
```

## Environment Variables

| Name | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | No | Public app URL. Defaults to `http://localhost:3001`. |
| `DATABASE_URL` | Production | PostgreSQL connection string for Prisma. |
| `REDIS_URL` | Production | Redis connection string for BullMQ and distributed caching. |
| `EXTRACTION_TIMEOUT_MS` | No | Upstream request timeout. Defaults to `15000`. |
| `RATE_LIMIT_WINDOW_MS` | No | Rate-limit window. Defaults to `60000`. |
| `RATE_LIMIT_MAX` | No | Requests per window. Defaults to `30`. |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS allowlist. |

## Docker

```bash
docker compose up --build
```

The compose stack starts Next.js, PostgreSQL, and Redis.

## API

### `POST /api/extract`

```json
{ "url": "https://example.com/watch/video" }
```

Success:

```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "status": "completed",
    "streams": []
  },
  "requestId": "req_123"
}
```

DRM response:

```json
{
  "success": false,
  "code": "DRM_PROTECTED",
  "message": "This content is DRM protected and cannot be downloaded."
}
```

Other endpoints:

- `GET /api/extract/:id`
- `POST /api/download`
- `GET /api/history`

## Extractor Plugin Guide

Create a class implementing `VideoExtractor`:

```ts
export class AcmeExtractor implements VideoExtractor {
  readonly name = "acme";

  canHandle(context: ExtractionContext) {
    return context.sourceUrl.includes("acme.example");
  }

  async extract(context: ExtractionContext): Promise<ExtractorOutcome> {
    // Fetch public data, call DRM checks, and return normalized streams.
  }
}
```

Register it in `src/server/extractors/registry.ts` before the generic fallback.

## Queue Architecture

BullMQ is configured in `src/infrastructure/queue/extraction-queue.ts` with retry and exponential backoff. The worker entrypoint in `src/workers/extraction-worker.ts` delegates to `ExtractionService`, keeping synchronous API behavior and async queue behavior on the same application service.

## Testing

```bash
npm run typecheck
npm run test
```

Tests cover DRM rejection, manifest parsing, UI primitives, and API response envelopes.

## Deployment

1. Provision PostgreSQL and Redis.
2. Set environment variables.
3. Install `yt-dlp` and `ffmpeg` in the runtime image.
4. Run `npm run prisma:generate`.
5. Run Prisma migrations.
6. Build with `npm run build`.
7. Start with `npm run start`.

## Scaling Strategy

Run the Next.js app horizontally behind a load balancer. Move expensive extraction work to BullMQ workers backed by Redis. Store extraction records in PostgreSQL and introduce object storage only if future features persist thumbnails or generated artifacts.

## Contributing

- Use conventional commits.
- Keep route handlers thin.
- Add extractor-specific tests for every new provider.
- Do not add logic that bypasses DRM, authentication, signed URL restrictions, or network access controls.
- Prefer small modules with explicit contracts over shared utility sprawl.
