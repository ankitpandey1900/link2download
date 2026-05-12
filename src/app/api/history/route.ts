import { NextResponse } from "next/server";

import { extractionService } from "@/server/extraction/extraction-service";
import { withApiHandler, optionsResponse } from "@/shared/server/http";

export const GET = withApiHandler(async (_request, { requestId }) => {
  const data = await extractionService.history();
  return NextResponse.json({ success: true, data, requestId });
});

export const OPTIONS = optionsResponse;
