import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";

import { AppError, ValidationError } from "@/shared/server/errors";

const allowedProtocols = new Set(["http:", "https:"]);

export async function assertPublicHttpUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ValidationError("URL must be absolute and valid.");
  }

  if (!allowedProtocols.has(url.protocol)) {
    throw new ValidationError("Only HTTP and HTTPS URLs are supported.");
  }

  const addresses = await dns.lookup(url.hostname, { all: true });
  if (addresses.length === 0) {
    throw new AppError("UPSTREAM_UNAVAILABLE", "Unable to resolve the target host.", 502);
  }

  for (const address of addresses) {
    const parsed = ipaddr.parse(address.address);
    if (parsed.range() !== "unicast") {
      throw new AppError("SSRF_BLOCKED", "The requested host is not publicly reachable.", 400);
    }
  }

  return normalizeUrl(url);
}

export function normalizeUrl(url: URL) {
  url.hash = "";
  return url.toString();
}
