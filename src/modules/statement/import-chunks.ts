import { chunkList, IMPORT_CHUNK_SIZE, IMPORT_MAX_ROWS } from "@/domain";
import { api } from "@/core/http";
import { csvLineList, fold, parseCsv } from "@/shared/lib/csv";

export type ChunkImportResult = {
  created: number;
  updated: number;
  paid: number;
  unidentified: number;
  skipped: { reason: string }[];
};

export type MapImportChunkResult = {
  csv: string;
  usedAi: boolean;
  aiAvailable: boolean;
  mapping: Record<string, string>;
  sample?: {
    totalRows: number;
    shown: number;
    columns: { field: string; label: string; source: string; column: string }[];
    rows: Record<string, string>[];
  };
  review?: { usedAi: boolean; ok: boolean; summary: string };
  headerIndex: number;
  truncated: boolean;
};

type InterpretRow = {
  line: number;
  date?: string;
  type?: string;
  amount?: number;
  description?: string;
  memberId?: string;
  error?: string;
  [key: string]: unknown;
};

export type InterpretChunkResult = {
  layout: "template" | "bank";
  aiUsed: boolean;
  aiAvailable: boolean;
  aiMapped?: boolean;
  mapping?: Record<string, string>;
  sample?: MapImportChunkResult["sample"];
  review?: MapImportChunkResult["review"];
  truncated: boolean;
  rows: InterpretRow[];
};

const HEADER_PROBE_LINES = 40;

export async function postImportChunks<T>(
  path: string,
  rows: T[],
  onProgress?: (current: number, total: number) => void,
  options?: { importSource?: "csv" | "pdf" },
): Promise<ChunkImportResult> {
  const unique = uniqueItems(rows, persistKey);
  const chunks = chunkList(unique, IMPORT_CHUNK_SIZE);
  const acc: ChunkImportResult = { created: 0, updated: 0, paid: 0, unidentified: 0, skipped: [] };
  for (let index = 0; index < chunks.length; index += 1) {
    onProgress?.(index + 1, chunks.length);
    const result = await api<{
      created: number;
      updated?: number;
      paid?: number;
      unidentified?: number;
      skipped: { reason: string }[];
    }>(path, {
      method: "POST",
      body: JSON.stringify({
        rows: chunks[index],
        ...(options?.importSource ? { importSource: options.importSource } : {}),
      }),
    });
    acc.created += result.created;
    acc.updated += result.updated ?? 0;
    acc.paid += result.paid ?? 0;
    acc.unidentified += result.unidentified ?? 0;
    acc.skipped.push(...(result.skipped ?? []));
  }
  return acc;
}

export async function mapImportFile(
  csv: string,
  kind: "members" | "statement",
  onProgress?: (current: number, total: number) => void,
): Promise<MapImportChunkResult> {
  const probe = await api<Omit<MapImportChunkResult, "truncated">>("/integrations/map-import", {
    method: "POST",
    body: JSON.stringify({ csv: probeCsv(csv), kind }),
  });
  const planned = splitAfterHeader(csv, probe.headerIndex ?? 0);
  const mapping = probe.mapping ?? {};
  const csvParts: string[] = [];

  for (let index = 0; index < planned.parts.length; index += 1) {
    onProgress?.(index + 1, planned.parts.length);
    const mapped = await api<Omit<MapImportChunkResult, "truncated">>("/integrations/map-import", {
      method: "POST",
      body: JSON.stringify({
        csv: planned.parts[index],
        kind,
        mapping,
      }),
    });
    csvParts.push(mapped.csv);
  }

  const merged = mergeMappedCsv(csvParts);
  const sample = probe.sample
    ? { ...probe.sample, totalRows: Math.max(probe.sample.totalRows, countDataRows(merged)) }
    : probe.sample;
  return {
    csv: merged,
    usedAi: probe.usedAi,
    aiAvailable: probe.aiAvailable,
    mapping,
    sample,
    review: probe.review,
    headerIndex: probe.headerIndex ?? 0,
    truncated: planned.truncated,
  };
}

export async function interpretStatementFile(
  input: { csv?: string; pdf?: string },
  onProgress?: (current: number, total: number) => void,
): Promise<InterpretChunkResult> {
  let csv = input.csv ?? "";
  if (input.pdf) {
    onProgress?.(1, 2);
    const converted = await api<{ csv: string }>("/integrations/interpret-statement", {
      method: "POST",
      body: JSON.stringify({ pdf: input.pdf, convertOnly: true }),
    });
    csv = converted.csv;
  }
  const probe = await api<{ headerIndex?: number; mapping?: Record<string, string> }>("/integrations/map-import", {
    method: "POST",
    body: JSON.stringify({ csv: probeCsv(csv), kind: "statement" }),
  });
  const planned = splitAfterHeader(csv, probe.headerIndex ?? 0);
  const mapping = probe.mapping ?? {};
  let layout: InterpretChunkResult["layout"] = "bank";
  let aiUsed = false;
  let aiAvailable = false;
  let aiMapped = false;
  let sample: InterpretChunkResult["sample"];
  let review: InterpretChunkResult["review"];
  const rows: InterpretRow[] = [];
  let lineOffset = 0;

  for (let index = 0; index < planned.parts.length; index += 1) {
    onProgress?.(index + 1, planned.parts.length);
    const result = await api<InterpretChunkResult>("/integrations/interpret-statement", {
      method: "POST",
      body: JSON.stringify({
        csv: planned.parts[index],
        mapping: Object.keys(mapping).length ? mapping : undefined,
        lineOffset,
        enrichAi: index === 0,
      }),
    });
    if (index === 0) {
      layout = result.layout;
      aiAvailable = result.aiAvailable;
      sample = result.sample;
      review = result.review;
      aiMapped = Boolean(result.aiMapped);
    }
    aiUsed = aiUsed || result.aiUsed;
    rows.push(...result.rows);
    lineOffset += Math.max(0, csvLineList(planned.parts[index] ?? "").length - 1);
  }

  const uniqueRows = uniqueItems(rows, statementKey);
  if (sample) {
    sample = { ...sample, totalRows: Math.max(sample.totalRows, uniqueRows.length) };
  }
  return {
    layout,
    aiUsed,
    aiAvailable,
    aiMapped,
    mapping,
    sample,
    review,
    truncated: planned.truncated,
    rows: uniqueRows,
  };
}

export function splitAfterHeader(csv: string, headerIndex: number, size = IMPORT_CHUNK_SIZE) {
  const lines = csvLineList(csv);
  const safeHeader = Math.min(Math.max(headerIndex, 0), Math.max(lines.length - 1, 0));
  const headerLine = lines[safeHeader] ?? "";
  const dataStart = Math.min(safeHeader + 1, lines.length);
  const truncated = lines.length - dataStart > IMPORT_MAX_ROWS;
  const limited = truncated ? lines.slice(0, dataStart + IMPORT_MAX_ROWS) : lines;
  const data = limited.slice(dataStart).filter((line) => line.trim() && !sameCsvLine(line, headerLine));
  const uniqueData = uniqueItems(data, (line) => fold(line));
  const parts = chunkList(uniqueData, size).map((chunk) => [headerLine, ...chunk].join("\n"));
  return { parts: parts.length ? parts : [headerLine].filter(Boolean), truncated };
}

function probeCsv(csv: string): string {
  return csvLineList(csv).slice(0, HEADER_PROBE_LINES).join("\n");
}

function mergeMappedCsv(parts: string[]): string {
  const tables = parts.map((part) => parseCsv(part)).filter((table) => table.headers.length);
  if (!tables.length) return "";
  const headers = tables[0]!.headers;
  const rows: Record<string, string>[] = [];
  const seen = new Set<string>();
  for (const table of tables) {
    for (const row of table.rows) {
      if (looksLikeHeaderRow(row, headers)) continue;
      const key = headers.map((header) => fold(row[header] ?? "")).join("|");
      if (!key.replaceAll("|", "") || seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }
  const escape = (value: string) => (/[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  return [headers.join(";"), ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(";"))].join(
    "\n",
  );
}

function countDataRows(csv: string): number {
  return parseCsv(csv).rows.length;
}

function looksLikeHeaderRow(row: Record<string, string>, headers: string[]) {
  return headers.every((header) => fold(row[header] ?? "") === fold(header));
}

function sameCsvLine(left: string, right: string) {
  return fold(left.replace(/[;"\t]+/g, " ")) === fold(right.replace(/[;"\t]+/g, " "));
}

function statementKey(row: InterpretRow) {
  return `${row.date ?? ""}|${row.type ?? ""}|${row.amount ?? ""}|${fold(String(row.description ?? ""))}|${row.memberId ?? ""}`;
}

function persistKey(row: unknown) {
  if (!row || typeof row !== "object") return JSON.stringify(row);
  const value = row as Record<string, unknown>;
  if (typeof value.email === "string" && value.email) return `email:${fold(value.email)}`;
  return statementKey({
    line: 0,
    date: String(value.date ?? ""),
    type: String(value.type ?? ""),
    amount: Number(value.amount ?? 0),
    description: String(value.description ?? ""),
    memberId: value.memberId ? String(value.memberId) : undefined,
  });
}

function uniqueItems<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const next: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    if (key) seen.add(key);
    next.push(item);
  }
  return next;
}
