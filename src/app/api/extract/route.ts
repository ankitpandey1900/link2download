import { NextResponse, type NextRequest } from "next/server";

import { extractRequestSchema } from "@/features/extraction/validation";
import { extractionService } from "@/server/extraction/extraction-service";
import { assertRateLimit } from "@/shared/server/rate-limit";
import { parseJson, withApiHandler, optionsResponse } from "@/shared/server/http";

export const POST = withApiHandler(async (request: NextRequest, { requestId }) => {
  assertRateLimit(request.headers.get("x-forwarded-for") ?? "anonymous");
  const dto = await parseJson(request, extractRequestSchema);
  const data = await extractionService.extract(dto.url, requestId);

  return NextResponse.json({ success: true, data, requestId }, { status: 201 });
});

export const OPTIONS = optionsResponse;
