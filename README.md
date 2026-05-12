# Link2Download: Universal Media Extraction Pipeline

Link2Download is a high-performance video stream extraction engine built on Next.js 15. It identifies, normalizes, and proxies media streams (HLS, DASH, MP4) from disparate web sources while strictly adhering to a "No DRM" policy.

Designed for reliability and observability, it features a plugin-based architecture for provider-specific extraction, built-in SSRF protection, and a robust proxy layer to bypass common CDN blocks.

---

## 🏗️ Architecture & Philosophy

The project follows a **Feature-Driven Clean Architecture** pattern. Logic is strictly decoupled from the delivery layer (API routes/UI).

### Core Layers

- **`src/features/*`**: Domain-specific UI, state management, and client-side logic.
- **`src/server/extractors`**: A registry of provider-specific plugins. Each extractor is a self-contained module implementing a standard contract.
- **`src/server/extraction`**: The orchestrator service. Handles validation, concurrent extraction attempts, normalization, and persistence.
- **`src/app/api/proxy`**: A specialized proxy layer that propagates essential headers (Referer, Origin, User-Agent) to bypass bot detection on media CDNs.

### Engineering Standards

- **DRM Boundary**: Explicit rejection of Widevine, FairPlay, and PlayReady signals.
- **SSRF Hardening**: Strict URL validation, DNS resolution checks, and blocking of non-public IP ranges.
- **Typed Config**: Environment variables are validated at runtime using Zod.
- **Resilient Proxying**: Intelligent manifest rewriting for HLS/DASH to ensure all segments flow through the authenticated proxy path.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 20+ 
- **FFmpeg**: Required for stream processing/downloading.
- **yt-dlp**: Required for generic fallback support.

### Installation

```bash
# Install dependencies
npm install

# Generate database client (Prisma)
npm run prisma:generate

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:3001`.

---

## 🔧 Environment Configuration

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `undefined` | PostgreSQL connection string. |
| `REDIS_URL` | `undefined` | Redis connection for BullMQ and caching. |
| `EXTRACTION_TIMEOUT_MS` | `15000` | Timeout for upstream provider requests. |
| `RATE_LIMIT_MAX` | `30` | Max requests per minute per IP. |

---

## 🛠️ Development Workflow

### Adding a New Extractor

1. Create a new class in `src/server/extractors/custom/` implementing the `VideoExtractor` contract.
2. Define `canHandle(context)` logic based on domain or HTML patterns.
3. Implement `extract(context)` to return a normalized `ExtractorOutcome`.
4. Register the new extractor in `src/server/extractors/registry.ts`.

### Testing

```bash
# Run unit and integration tests
npm run test

# Run API-specific test suite
npm run test:api

# Verify type integrity
npm run typecheck
```

---

## 🐳 Deployment

The project includes a multi-stage `Dockerfile` and `docker-compose.yml` for production-ready deployment.

```bash
docker compose up --build -d
```

This stack initializes:
1. **Next.js App**: Running in production mode.
2. **PostgreSQL**: For persistent extraction history.
3. **Redis**: For job queuing and rate limiting.

---

## 🤝 Contributing

We maintain a high bar for code quality and security:
- **Conventional Commits**: All commits must follow the conventional commit specification.
- **Thin Handlers**: UI components and API routes should contain zero business logic.
- **No DRM Bypass**: Do not submit PRs that attempt to circumvent encryption or authentication systems.
- **Security First**: All new extractors must be audited for SSRF vulnerabilities.

---

&copy; 2026 Link2Download / Engineering Team
