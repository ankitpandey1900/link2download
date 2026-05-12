import type { ExtractionResult } from "@/features/extraction/types";
import { env } from "@/config/env";

export interface ExtractionRepository {
  findById(id: string): Promise<ExtractionResult | null>;
  findByUrl(url: string): Promise<ExtractionResult | null>;
  history(): Promise<ExtractionResult[]>;
  save(result: ExtractionResult): Promise<void>;
}

class MemoryExtractionRepository implements ExtractionRepository {
  private readonly records = new Map<string, ExtractionResult>();

  async findById(id: string) {
    return this.records.get(id) ?? null;
  }

  async findByUrl(url: string) {
    return [...this.records.values()].find((item) => item.url === url) ?? null;
  }

  async history() {
    return [...this.records.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 25);
  }

  async save(result: ExtractionResult) {
    this.records.set(result.id, result);
  }
}

class PrismaExtractionRepository implements ExtractionRepository {
  async findById(id: string) {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const row = await prisma.extraction.findUnique({ where: { id } });
    return row ? toResult(row) : null;
  }

  async findByUrl(url: string) {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const row = await prisma.extraction.findUnique({ where: { url } });
    return row ? toResult(row) : null;
  }

  async history() {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const rows = await prisma.extraction.findMany({ orderBy: { createdAt: "desc" }, take: 25 });
    return rows.map(toResult);
  }

  async save(result: ExtractionResult) {
    const { prisma } = await import("@/infrastructure/database/prisma");
    await prisma.extraction.upsert({
      where: { url: result.url },
      create: {
        id: result.id,
        url: result.url,
        status: result.status,
        metadata: result.metadata,
        streams: result.streams
      },
      update: {
        status: result.status,
        metadata: result.metadata,
        streams: result.streams
      }
    });
  }
}

type ExtractionRow = {
  id: string;
  url: string;
  status: string;
  metadata: unknown;
  streams: unknown;
  createdAt: Date;
};

function toResult(row: ExtractionRow): ExtractionResult {
  return {
    id: row.id,
    url: row.url,
    status: row.status === "failed" ? "failed" : "completed",
    metadata: row.metadata as ExtractionResult["metadata"],
    streams: row.streams as ExtractionResult["streams"],
    createdAt: row.createdAt.toISOString()
  };
}

export const extractionRepository: ExtractionRepository = env.DATABASE_URL
  ? new PrismaExtractionRepository()
  : new MemoryExtractionRepository();
