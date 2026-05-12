import { Download, ArrowRight, Video, List, Zap } from "lucide-react";
import { ExtractionConsole } from "@/features/extraction/components/extraction-console";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground font-mono selection:bg-foreground selection:text-background">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-32">
        
        {/* Simple Header */}
        <header className="flex items-center justify-between mb-24 border-b border-foreground/10 pb-8">
          <div className="flex items-center gap-2">
            <div className="bg-foreground text-background p-1">
              <Download className="h-5 w-5" />
            </div>
            <span className="text-xl font-black uppercase tracking-tighter">
              Link2Download
            </span>
          </div>
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest opacity-50">
            <a href="#" className="hover:opacity-100 transition-opacity">Sitemap</a>
            <a href="#" className="hover:opacity-100 transition-opacity">GitHub</a>
          </div>
        </header>

        {/* Hero Section */}
        <section className="grid gap-16 lg:grid-cols-[1.2fr_0.8fr] items-start mb-32">
          <div className="space-y-16">
            <div className="space-y-8">
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black uppercase leading-[0.9] tracking-tighter">
                Watch it. <br /> 
                <span className="text-foreground/40">Download it.</span>
              </h1>
              <p className="max-w-md text-sm sm:text-base leading-relaxed opacity-60">
                A minimalist video streaming pipeline. Paste a URL, get raw streams. No ads, no trackers, no noise. Support for HLS, DASH, and direct MP4.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-8">
              <div className="flex items-center gap-4 group cursor-pointer">
                <div className="h-10 w-10 border-2 border-foreground flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-all">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Turbo Engine</span>
              </div>
              <div className="flex items-center gap-4 group cursor-pointer">
                <div className="h-10 w-10 border-2 border-foreground flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-all">
                  <List className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Deep Scan Series</span>
              </div>
            </div>
          </div>

          <div className="border-4 border-foreground p-1 bg-foreground w-full">
            <div className="bg-background p-6 sm:p-10">
               <ExtractionConsole />
            </div>
          </div>
        </section>

        {/* Info Grid */}
        <section className="grid gap-4 sm:grid-cols-3 mb-32">
          {[
            { title: "Universal", desc: "One engine for 1000+ sites." },
            { title: "Raw Data", desc: "Direct links to manifest files." },
            { title: "No DRM", desc: "Explicitly for public media." }
          ].map(f => (
            <div key={f.title} className="border-2 border-foreground/10 p-8 space-y-4 hover:border-foreground transition-colors group">
               <h3 className="text-xs font-black uppercase tracking-[0.2em]">{f.title}</h3>
               <p className="text-[11px] opacity-50 leading-relaxed uppercase font-bold">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="pt-12 border-t border-foreground/10 flex flex-col md:flex-row justify-between gap-8 opacity-40 text-[10px] font-bold uppercase tracking-[0.2em]">
          <div>&copy; 2026 LINK2DOWNLOAD / STABLE VERSION</div>
          <div className="flex gap-8">
            <a href="#" className="hover:opacity-100 transition-opacity">Privacy</a>
            <a href="#" className="hover:opacity-100 transition-opacity">API Docs</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
