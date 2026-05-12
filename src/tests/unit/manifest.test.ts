import { describe, expect, it } from "vitest";

import { parseHlsManifest } from "@/server/extractors/manifest";

describe("HLS manifest parsing", () => {
  it("normalizes variant streams", () => {
    const streams = parseHlsManifest(
      "https://media.example.com/master.m3u8",
      "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2400000,RESOLUTION=1920x1080,CODECS=\"avc1\"\n1080/prog.m3u8"
    );

    expect(streams).toHaveLength(1);
    expect(streams[0]).toMatchObject({
      container: "hls",
      quality: "1080p",
      url: "https://media.example.com/1080/prog.m3u8",
      downloadable: true
    });
  });
});
