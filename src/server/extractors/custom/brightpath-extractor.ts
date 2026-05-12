import type { ExtractionContext, VideoExtractor, ExtractorOutcome } from "@/server/extractors/contracts";
import type { VideoStream } from "@/features/extraction/types";
import { fetchWithTimeout } from "@/shared/server/fetcher";
import { nanoid } from "nanoid";

export class BrightPathExtractor implements VideoExtractor {
    readonly name = "BrightPath";
    private readonly domains = ["brightpathsignals.com", "streamimdb.ru", "vaplayer.ru", "playimdb.com"];

    async canHandle(context: ExtractionContext): Promise<boolean> {
        return this.domains.some(domain => context.sourceUrl.includes(domain));
    }

    async extract(context: ExtractionContext): Promise<ExtractorOutcome> {
        const targetUrl = context.sourceUrl;

        // 1. Extract IMDB ID from the URL
        const imdbId = targetUrl.match(/tt\d+/)?.[0];
        if (!imdbId) throw new Error("No IMDB ID found in URL. Use a link like playimdb.com/title/tt0371746");

        const mediaType = targetUrl.includes("/tv/") ? "tv" : "movie";
        const urlObj = new URL(targetUrl);
        
        // Parse season and episode
        const season = urlObj.searchParams.get("s") || urlObj.searchParams.get("season");
        const episode = urlObj.searchParams.get("e") || urlObj.searchParams.get("episode");
        
        // Also try path-based: /tv/tt123456/1/2
        const pathParts = urlObj.pathname.split("/");
        const tvIdx = pathParts.indexOf("tv");
        let pathSeason = "";
        let pathEpisode = "";
        if (tvIdx !== -1 && pathParts.length > tvIdx + 2) {
            pathSeason = pathParts[tvIdx + 2];
            pathEpisode = pathParts[tvIdx + 3] || "";
        }
        
        const s = season || pathSeason || (mediaType === "tv" ? "1" : "");
        const e = episode || pathEpisode || (mediaType === "tv" ? "1" : "");

        return this.extractEpisode(imdbId, s, e, mediaType, context.sourceUrl);
    }

    async extractEpisode(imdbId: string, s: string, e: string, mediaType: string = "movie", sourceUrl?: string): Promise<ExtractorOutcome> {
        const playerUrl = `https://brightpathsignals.com/embed/${mediaType}/${imdbId}${mediaType === "tv" ? `/${s}/${e}` : ""}`;

        // 2. Touch the player page to establish a session (cookies)
        const playerRes = await fetchWithTimeout(playerUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Referer": "https://streamimdb.ru/"
            }
        });
        const cookies = playerRes.headers.get("set-cookie") || "";
        const playerHtml = await playerRes.text();

        // 3. Extract the real API URL from CONFIG if present, otherwise use known default
        let streamApiUrl = "https://streamdata.vaplayer.ru/api.php";
        const configMatch = playerHtml.match(/const\s+CONFIG\s*=\s*({.*?});/s);
        if (configMatch) {
            try {
                const config = JSON.parse(configMatch[1]);
                if (config.streamDataApiUrl) streamApiUrl = config.streamDataApiUrl;
            } catch (err) { /* use default */ }
        }

        // 4. Call the REAL API endpoint with session cookies
        let apiUrl = `${streamApiUrl}?imdb=${encodeURIComponent(imdbId)}&type=${mediaType}`;
        if (mediaType === "tv") {
            apiUrl += `&season=${s}&episode=${e}`;
        }

        const apiRes = await fetchWithTimeout(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Referer": playerUrl,
                "Origin": "https://brightpathsignals.com",
                "Cookie": cookies
            }
        });

        if (!apiRes.ok) throw new Error(`API returned ${apiRes.status}`);

        const json = await apiRes.json();
        if (json.status_code !== "200" && json.status_code !== 200) {
            throw new Error(`API error: ${JSON.stringify(json)}`);
        }

        const data = json.data;
        if (!data?.stream_urls?.length) throw new Error("No stream URLs in API response");

        // 5. Build stream list from the response
        const streams: VideoStream[] = [];
        let title = data.title || "Movie";
        const backdrop = data.backdrop || "";
        
        if (mediaType === "tv" && data.season && data.episode) {
            title += ` - S${data.season} E${data.episode}`;
        }
        
        const streamHeaders = {
            "Referer": "https://brightpathsignals.com/",
            "Origin": "https://brightpathsignals.com",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        };

        for (const url of data.stream_urls) {
            if (url.includes(".m3u8")) {
                try {
                    const mRes = await fetchWithTimeout(url, { headers: streamHeaders });
                    const manifest = await mRes.text();
                    const lines = manifest.split("\n");
                    let foundVariants = false;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes("RESOLUTION=")) {
                            const res = lines[i].match(/RESOLUTION=(\d+)x(\d+)/);
                            const nextLine = lines[i + 1]?.trim();
                            if (res && nextLine && !nextLine.startsWith("#")) {
                                const quality = res[2] + "p";
                                const absUrl = nextLine.startsWith("http") ? nextLine : new URL(nextLine, url).toString();
                                streams.push({ 
                                    id: `bp_${nanoid(8)}`, 
                                    url: absUrl, 
                                    container: "hls", 
                                    quality, 
                                    downloadable: true,
                                    headers: streamHeaders
                                });
                                foundVariants = true;
                            }
                        }
                    }
                    if (!foundVariants) {
                        streams.push({ id: `bp_${nanoid(8)}`, url, container: "hls", quality: "Auto", downloadable: true, headers: streamHeaders });
                    }
                } catch {
                    streams.push({ id: `bp_${nanoid(8)}`, url, container: "hls", quality: "HD", downloadable: true, headers: streamHeaders });
                }
            } else {
                streams.push({ id: `bp_${nanoid(8)}`, url, container: "mp4", quality: "Source", downloadable: true, headers: streamHeaders });
            }
        }

        if (streams.length === 0) throw new Error("Failed to parse stream URLs");

        return {
            metadata: {
                title,
                thumbnailUrl: backdrop,
                sourceUrl: sourceUrl || playerUrl,
                provider: "BrightPath / PlayIMDB",
            },
            streams: streams.sort((a, b) => (parseInt(b.quality || "0") || 0) - (parseInt(a.quality || "0") || 0))
        };
    }
}
