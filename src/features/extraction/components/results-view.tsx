"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Play, Copy, Check, Layers3, ArrowLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { HlsPlayer } from "@/shared/ui/hls-player";
import { type ExtractionResult, type VideoStream } from "@/features/extraction/types";
import { cn } from "@/shared/lib/utils";
import Link from "next/link";

interface ResultsViewProps {
  extraction: ExtractionResult;
}

export function ResultsView({ extraction }: ResultsViewProps) {
  const [selectedStream, setSelectedStream] = useState<VideoStream | null>(
    extraction.streams[0] || null
  );
  const [copied, setCopied] = useState(false);
  const [episodes, setEpisodes] = useState<any[]>(extraction.metadata.episodes || []);
  const [isScanning, setIsScanning] = useState(false);

  const imdbId = extraction.metadata.sourceUrl.match(/tt\d+/)?.[0];
  const isTv = extraction.metadata.sourceUrl.includes("/tv/");

  const scanSeries = async () => {
    if (!imdbId) return;
    setIsScanning(true);
    try {
      const res = await fetch(`/api/extract/series?imdbId=${imdbId}&type=tv`);
      const json = await res.json();
      if (json.success) {
        setEpisodes(json.data.episodes);
      }
    } catch (err) {
      console.error("Scan failed", err);
    } finally {
      setIsScanning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAllLinks = () => {
    const links = episodes.flatMap(ep => ep.streams.map((s: any) => `${ep.title} - S${ep.season}E${ep.number} (${s.quality}): ${s.url}`)).join("\n");
    const blob = new Blob([links], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${extraction.metadata.title}_all_episodes.txt`;
    a.click();
  };

  const downloadAllOneByOne = async () => {
    for (const ep of episodes) {
      if (ep.streams.length > 0) {
        const s = ep.streams[0]; // Take highest quality
        const downloadUrl = `/api/download?url=${encodeURIComponent(s.url)}&filename=${encodeURIComponent(`${extraction.metadata.title}_S${ep.season}E${ep.number}_${s.quality}.ts`)}`;
        
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${extraction.metadata.title}_S${ep.season}E${ep.number}.ts`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        await new Promise(r => setTimeout(r, 500));
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-20 space-y-24 animate-in fade-in duration-700 font-mono">
      
      {/* Navigation */}
      <div className="flex items-center justify-between border-b border-foreground/10 pb-8">
        <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background px-2 py-1 transition-all">
          <ArrowLeft className="h-3 w-3" />
          Back to Terminal
        </Link>
        <div className="text-[10px] font-black uppercase tracking-widest opacity-30">
          Result ID: {extraction.id}
        </div>
      </div>

      {/* Header */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.8] max-w-2xl">
            {extraction.metadata.title}
          </h1>
          <div className="flex gap-4">
             <Button variant="secondary" onClick={() => copyToClipboard(selectedStream?.url || "")} className="border-2 border-foreground h-12 px-6 text-xs font-black uppercase">
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "COPIED" : "COPY STREAM"}
             </Button>
             {isTv && (
                <Button 
                   onClick={scanSeries} 
                   disabled={isScanning}
                   className="bg-foreground text-background hover:invert h-12 px-6 text-xs font-black uppercase transition-all"
                >
                   <Layers3 className={cn("h-4 w-4 mr-2", isScanning && "animate-spin")} />
                   {isScanning ? "SCANNING..." : "DEEP SCAN SERIES"}
                </Button>
             )}
          </div>
        </div>
      </div>

      {/* Player Section */}
      <div className="grid gap-12 lg:grid-cols-[1fr_350px]">
        <div className="space-y-6">
           <div className="aspect-video bg-black border-4 border-foreground overflow-hidden">
              {selectedStream ? (
                <HlsPlayer 
                  src={selectedStream.url} 
                  className="w-full h-full" 
                  headers={selectedStream.headers}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-black uppercase tracking-[0.2em]">
                  Awaiting Signal...
                </div>
              )}
           </div>
           <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
              <span>Resolution: {selectedStream?.quality || "Auto"}</span>
              <span>Container: {selectedStream?.container || "N/A"}</span>
           </div>
        </div>

        <div className="space-y-8">
           <div className="text-[10px] font-black uppercase tracking-[0.2em] border-b border-foreground/10 pb-4">Available Channels</div>
           <div className="space-y-2">
              {extraction.streams.map((stream) => (
                <div 
                  key={stream.id}
                  onClick={() => setSelectedStream(stream)}
                  className={cn(
                    "flex items-center justify-between p-4 border-2 transition-all cursor-pointer group",
                    selectedStream?.id === stream.id 
                      ? "bg-foreground text-background border-foreground" 
                      : "bg-transparent border-foreground/10 hover:border-foreground"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <Play className={cn("h-3 w-3", selectedStream?.id === stream.id ? "fill-current" : "opacity-20")} />
                    <span className="text-[11px] font-black uppercase">{stream.quality} STREAM</span>
                  </div>
                  <a 
                    href={`/api/download?url=${encodeURIComponent(stream.url)}&filename=${encodeURIComponent(`${extraction.metadata.title}_${stream.quality}.ts`)}`}
                    className={cn("p-1 hover:invert", selectedStream?.id === stream.id ? "text-background" : "text-foreground")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Episodes Section */}
      {episodes.length > 0 && (
        <div className="space-y-12 pt-12 border-t-4 border-foreground animate-in slide-in-from-bottom-8 duration-700">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                 <h2 className="text-4xl font-black uppercase tracking-tighter">Series Directory</h2>
                 <p className="text-[10px] font-bold opacity-40 uppercase max-w-sm leading-relaxed">
                   Batch discovery complete. Export for IDM or trigger browser sequence. 
                   Set browser to auto-save for best performance.
                 </p>
              </div>
              <div className="flex gap-4">
                <Button variant="secondary" onClick={downloadAllLinks} className="border-2 border-foreground h-12 px-6 text-[10px] font-black uppercase">
                   EXPORT LIST (.TXT)
                </Button>
                <Button onClick={downloadAllOneByOne} className="bg-foreground text-background hover:invert h-12 px-6 text-[10px] font-black uppercase transition-all">
                   DOWNLOAD ALL (ONE-BY-ONE)
                </Button>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/10 border border-foreground/10">
              {episodes.map(ep => (
                <div key={ep.id} className="p-6 bg-background hover:bg-foreground/5 transition-all group">
                   <div className="text-[10px] font-black opacity-30 mb-2">S{ep.season} E{ep.number}</div>
                   <div className="text-xs font-black uppercase truncate mb-6">{ep.title || `Episode ${ep.number}`}</div>
                   <div className="flex gap-2">
                      {ep.streams.slice(0, 2).map((s: any, idx: number) => (
                        <a 
                          key={idx}
                          href={`/api/download?url=${encodeURIComponent(s.url)}&filename=${encodeURIComponent(`${extraction.metadata.title}_S${ep.season}E${ep.number}_${s.quality}.ts`)}`}
                          className="flex-1 text-[9px] font-black border-2 border-foreground py-2 text-center uppercase hover:bg-foreground hover:text-background transition-all"
                        >
                          {s.quality}
                        </a>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
