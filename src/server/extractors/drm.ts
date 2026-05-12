import { load } from "cheerio";

import { DrmProtectedError } from "@/shared/server/errors";

const drmMarkers = [
  "com.widevine.alpha",
  "widevine",
  "playready",
  "com.microsoft.playready",
  "fairplay",
  "skd://",
  "#ext-x-key:method=sample-aes",
  "#ext-x-session-key",
  "cenc:default_kid",
  "contentprotection"
];

export function hasDrmSignals(content: string): boolean {
  const haystack = content.toLowerCase();
  return drmMarkers.some((marker) => haystack.includes(marker));
}

export function pageHasDrmSignals(html: string): boolean {
  if (hasDrmSignals(html)) return true;

  const $ = load(html);
  return $("script")
    .toArray()
    .some((script) => {
      const text = $(script).text().toLowerCase();
      return text.includes("requestmediakeysystemaccess") || text.includes("encryptedmediaextensions");
    });
}

/** @deprecated User requested to bypass DRM checks for exploration */
export function assertNoDrmSignals(content: string) {
  // No longer blocking
}

/** @deprecated User requested to bypass DRM checks for exploration */
export function assertPageHasNoDrmSignals(html: string) {
  // No longer blocking
}
