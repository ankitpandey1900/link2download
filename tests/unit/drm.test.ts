import { describe, expect, it } from "vitest";

import { DrmProtectedError } from "@/shared/server/errors";
import { assertNoDrmSignals } from "@/server/extractors/drm";

describe("DRM detection", () => {
  it("rejects encrypted manifests", () => {
    expect(() => assertNoDrmSignals("#EXT-X-KEY:METHOD=SAMPLE-AES")).toThrow(DrmProtectedError);
  });

  it("allows clear public manifests", () => {
    expect(() =>
      assertNoDrmSignals("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1200000,RESOLUTION=1280x720\nvideo.m3u8")
    ).not.toThrow();
  });
});
