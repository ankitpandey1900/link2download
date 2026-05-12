import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function GET(request: NextRequest) {
  // Use absolute path to bypass Next.js bundling issues
  const ffmpegName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const ffmpegPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", ffmpegName);

  if (!fs.existsSync(ffmpegPath)) {
    console.error(`FFmpeg not found at: ${ffmpegPath}`);
    return new Response("FFmpeg binary not found", { status: 500 });
  }
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "video.mp4";
  
  const referer = searchParams.get("referer");
  const origin = searchParams.get("origin");
  const ua = searchParams.get("ua");

  if (!targetUrl) {
    return new Response("Missing URL", { status: 400 });
  }

  if (!ffmpegPath) {
    return new Response("FFmpeg not found", { status: 500 });
  }

  // Create the stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Build the internal proxy URL to force FFmpeg through our tunnel
  const protocol = request.nextUrl.protocol;
  const host = request.nextUrl.host;
  
  const proxyParams = new URLSearchParams();
  proxyParams.set("url", targetUrl);
  if (referer) proxyParams.set("referer", referer);
  if (origin) proxyParams.set("origin", origin);
  if (ua) proxyParams.set("ua", ua);

  const proxiedUrl = `${protocol}//${host}/api/proxy?${proxyParams.toString()}`;

  // FFmpeg command optimized for 'Turbo' speed
  const ffmpeg = spawn(ffmpegPath, [
    "-thread_queue_size", "1024",
    "-i", proxiedUrl,
    "-c", "copy",
    "-f", "mpegts",
    "-max_reload", "10",
    "pipe:1"
  ]);

  ffmpeg.stdout.on("data", (chunk) => {
    writer.write(chunk);
  });

  ffmpeg.stderr.on("data", (data) => {
    // console.log(`ffmpeg: ${data}`);
  });

  ffmpeg.on("close", async () => {
    try {
      await writer.close();
    } catch (e) {
      // Stream already closed or error-ed, ignore
    }
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "video/mp2t",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Access-Control-Allow-Origin": "*",
    },
  });
}
