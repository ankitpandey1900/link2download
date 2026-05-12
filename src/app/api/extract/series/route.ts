import { NextResponse, type NextRequest } from "next/server";
import { batchExtractionService } from "@/server/extraction/batch-extraction-service";
import { withApiHandler, optionsResponse } from "@/shared/server/http";

export const GET = withApiHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const imdbId = searchParams.get("imdbId");
    const type = searchParams.get("type") as "tv" | "movie";

    if (!imdbId) {
        return NextResponse.json({ success: false, message: "imdbId is required" }, { status: 400 });
    }

    // This can take a long time, so for production you'd use a Background Job
    // but for this MVP we'll do it in the request (max 30-60s on most platforms)
    const episodes = await batchExtractionService.discoverEpisodes(imdbId, type || "tv");

    return NextResponse.json({ 
        success: true, 
        data: {
            imdbId,
            episodes
        }
    });
});

export const OPTIONS = optionsResponse;
