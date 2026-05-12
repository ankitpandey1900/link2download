import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "@/app/globals.css";
import { Providers } from "@/app/providers";
import { cn } from "@/shared/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "Link2Download | Universal Media Extraction Pipeline",
    template: "%s | Link2Download"
  },
  description: "High-performance media stream extraction and proxy engine. Support for HLS, DASH, and MP4 sources with built-in CDN bypass.",
  applicationName: "Link2Download",
  authors: [{ name: "Link2Download Engineering" }],
  keywords: ["video downloader", "stream extractor", "hls proxy", "dash downloader", "m3u8 extractor"],
  viewport: "width=device-width, initial-scale=1"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.variable, mono.variable, "font-sans antialiased")}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
