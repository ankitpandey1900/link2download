"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface HlsPlayerProps {
  src: string;
  className?: string;
  poster?: string;
  headers?: Record<string, string>;
}

export function HlsPlayer({ src, className, poster, headers }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    
    const getProxyUrl = (url: string) => {
        const proxyUrl = new URL("/api/proxy", window.location.origin);
        proxyUrl.searchParams.set("url", url);
        if (headers) {
            if (headers["Referer"]) proxyUrl.searchParams.set("referer", headers["Referer"]);
            if (headers["Origin"]) proxyUrl.searchParams.set("origin", headers["Origin"]);
            if (headers["User-Agent"]) proxyUrl.searchParams.set("ua", headers["User-Agent"]);
        }
        return proxyUrl.toString();
    };

    if (src.includes(".m3u8")) {
      if (Hls.isSupported()) {
        hls = new Hls({
          xhrSetup: (xhr, url) => {
            // ONLY proxy if it's an EXTERNAL URL (not on our own domain)
            const isExternal = url.startsWith("http") && !url.includes(window.location.host);
            if (isExternal) {
              xhr.open("GET", getProxyUrl(url), true);
            }
          }
        });
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari)
        video.src = getProxyUrl(src);
      }
    } else {
      // Normal video (MP4)
      video.src = getProxyUrl(src);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, headers]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls
      playsInline
      className={className}
    />
  );
}
