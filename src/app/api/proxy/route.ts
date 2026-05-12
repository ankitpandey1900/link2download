import { NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout } from "@/shared/server/fetcher";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  try {
    console.log(`[Proxy] Fetching: ${targetUrl}`);
    
    const referer = searchParams.get("referer") || "https://brightpathsignals.com/";
    const origin = searchParams.get("origin") || "https://brightpathsignals.com";
    const ua = searchParams.get("ua") || request.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    
    const headers: Record<string, string> = {
      "User-Agent": ua,
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": referer,
      "Origin": origin,
      "Connection": "keep-alive",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    const response = await fetch(targetUrl, {
      headers,
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`[Proxy] Target rejected request: ${response.status} ${response.statusText}`);
      return new NextResponse(`Proxy error: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "";
    
    // If it's a manifest, we need to rewrite relative URLs to absolute proxied ones
    if (targetUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("application/x-mpegURL")) {
        let text = await response.text();
        const baseDir = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
        
        const proxyParams = new URLSearchParams();
        proxyParams.set("referer", referer);
        proxyParams.set("origin", origin);
        proxyParams.set("ua", ua);

        // Rewrite relative links (not starting with http or /)
        text = text.replace(/^(?!(?:https?|ftp):\/\/|#|\/)(.*)$/gm, (match) => {
            if (!match.trim()) return match;
            const absoluteUrl = new URL(match, baseDir).toString();
            return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&${proxyParams.toString()}`;
        });
        
        // Rewrite absolute path links (starting with /)
        text = text.replace(/^\/(?!\/)(.*)$/gm, (match) => {
            const absoluteUrl = new URL(match, new URL(targetUrl).origin).toString();
            return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&${proxyParams.toString()}`;
        });
        
        // Rewrite fully qualified links
        text = text.replace(/^(https?:\/\/.*)$/gm, (match) => {
            return `/api/proxy?url=${encodeURIComponent(match)}&${proxyParams.toString()}`;
        });

        return new NextResponse(text, {
            headers: {
                "Content-Type": contentType,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache"
            }
        });
    }

    // For other files (segments, mp4), use streaming
    const body = response.body;

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
      },
    });
  } catch (error) {
    console.error("[Proxy] Critical failure:", error);
    return new NextResponse("Proxy failure", { status: 500 });
  }
}
