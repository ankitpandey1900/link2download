import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "@/app/globals.css";
import { Providers } from "@/app/providers";
import { cn } from "@/shared/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Link2Download",
  description: "Extract public video streams from webpages and generate downloadable links."
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
