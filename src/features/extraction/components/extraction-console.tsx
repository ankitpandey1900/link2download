"use client";

import { useState } from "react";
import { Search, Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";

export function ExtractionConsole() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Extraction failed");
      }

      router.push(`/results/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
          Source URL
        </label>
        <form onSubmit={handleExtract} className="flex flex-col gap-4">
          <div className="relative group">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/video"
              className="w-full bg-background border-2 border-foreground p-4 text-sm font-bold uppercase tracking-tight placeholder:opacity-20 focus:outline-none transition-all"
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !url}
            className="w-full h-14 bg-foreground text-background hover:invert transition-all flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Initialize Extraction
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </div>

      {error && (
        <div className="border-2 border-foreground p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest">Error Signal</div>
            <p className="text-xs font-bold leading-tight uppercase">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4 pt-4 border-t border-foreground/5">
         <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Supported Protocols</div>
         <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold opacity-50 uppercase">
            <span>HLS / M3U8</span>
            <span>DASH / MPD</span>
            <span>MP4 DIRECT</span>
            <span>JW PLAYER</span>
            <span>YT-DLP CORE</span>
         </div>
      </div>
    </div>
  );
}
