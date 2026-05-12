import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/extraction/extraction-service", () => ({
  extractionService: {
    extract: vi.fn(async () => ({
      id: "ex_test_123",
      url: "https://example.com/watch",
      status: "completed",
      metadata: { sourceUrl: "https://example.com/watch", provider: "example.com" },
      streams: [
        {
          id: "mp4_test",
          url: "https://cdn.example.com/video.mp4",
          container: "mp4",
          downloadable: true
        }
      ],
      createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString()
    }))
  }
}));

describe("POST /api/extract", () => {
  it("returns a normalized success envelope", async () => {
    const { POST } = await import("@/app/api/extract/route");
    const request = new NextRequest("http://localhost/api/extract", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/watch" }),
      headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" }
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.streams[0].container).toBe("mp4");
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });
});
