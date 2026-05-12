import { NextResponse } from "next/server";

import { extractionService } from "@/server/extraction/extraction-service";
import { notFound, withRouteApiHandler, optionsResponse } from "@/shared/server/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const GET = withRouteApiHandler<RouteContext>(async (_request, { params, requestId }) => {
  const { id } = await params;
  const data = await extractionService.get(id);
  if (!data) notFound("Extraction was not found.");

  return NextResponse.json({ success: true, data, requestId });
});

export const OPTIONS = optionsResponse;
