import { describe, expect, it } from "vitest";

import { DirectMediaExtractor } from "@/server/extractors/direct/direct-media-extractor";

describe("DirectMediaExtractor", () => {
  it("creates a stream for direct MP4 URLs", async () => {
    const extractor = new DirectMediaExtractor();

    const outcome = await extractor.extract({
      requestId: "req_test",
      sourceUrl: "https://cdn.example.com/video/source.mp4"
    });

    expect(outcome.metadata.provider).toBe("cdn.example.com");
    expect(outcome.streams[0]).toMatchObject({
      container: "mp4",
      url: "https://cdn.example.com/video/source.mp4",
      downloadable: true
    });
  });
});
