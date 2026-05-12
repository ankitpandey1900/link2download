import { notFound } from "next/navigation";

import { ResultsView } from "@/features/extraction/components/results-view";
import { extractionService } from "@/server/extraction/extraction-service";

type ResultsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const extraction = await extractionService.get(id);
  if (!extraction) notFound();

  return <ResultsView extraction={extraction} />;
}
