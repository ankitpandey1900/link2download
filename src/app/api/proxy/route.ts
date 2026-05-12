import { NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout } from "@/shared/server/fetcher";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing URL", { status: 400 });
  }

    try {
    const referer = searchParams.get("referer") || "https://brightpathsignals.com/";
    const origin = searchParams.get("origin") || "https://brightpathsignals.com";
    const ua = searchParams.get("ua") || request.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    
    const headers: Record<string, string> = {
      "User-Agent": ua,
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": referer,
      "Origin": origin,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    const response = await fetch(targetUrl, {
      headers,
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`[Proxy] Target rejected request: ${response.status} ${response.statusText} for URL: ${targetUrl}`);
      // Return the original error but with CORS headers so the client can see it
      return new NextResponse(`Proxy error: ${response.statusText}`, { 
        status: response.status,
        headers: {
            "Access-Control-Allow-Origin": "*"
        }
      });
    }

    const contentType = response.headers.get("content-type") || "";
    
    // If it's a manifest, we need to rewrite relative URLs to absolute proxied ones
    if (targetUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("application/x-mpegURL")) {
        let text = await response.text();
        const baseDir = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
        
        const proxyParams = new URLSearchParams();
        if (referer) proxyParams.set("referer", referer);
        if (origin) proxyParams.set("origin", origin);
        if (ua) proxyParams.set("ua", ua);

        // Rewrite relative links (not starting with http or /)
        text = text.replace(/^(?!(?:https?|ftp):\/\/|#|\/)(.+)$/gm, (match) => {
            const line = match.trim();
            if (!line) return match;
            const absoluteUrl = new URL(line, baseDir).toString();
            return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&${proxyParams.toString()}`;
        });
        
        // Rewrite absolute path links (starting with /)
        text = text.replace(/^\/(?!\/)(.+)$/gm, (match) => {
            const line = match.trim();
            const absoluteUrl = new URL(line, new URL(targetUrl).origin).toString();
            return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&${proxyParams.toString()}`;
        });
        
        // Rewrite fully qualified links
        text = text.replace(/^(https?:\/\/.*)$/gm, (match) => {
            const line = match.trim();
            return `/api/proxy?url=${encodeURIComponent(line)}&${proxyParams.toString()}`;
        });

        return new NextResponse(text, {
            headers: {
                "Content-Type": contentType,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
                "X-Proxy-Source": "Link2Download"
            }
        });
    }

    // For other files (segments, mp4), use streaming
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
      },
    });
  } catch (error) {
    // Suppress common streaming errors that occur when client aborts
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("ResponseAborted") || errorMessage.includes("aborted")) {
        return new NextResponse(null, { status: 499 }); // Client Closed Request
    }

    console.error("[Proxy] Critical failure:", error);
    return new NextResponse("Proxy failure", { status: 500 });
  }
}
