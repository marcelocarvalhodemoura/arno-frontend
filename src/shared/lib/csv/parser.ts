import { fold } from "@/shared/lib/csv/fold";

export type CsvTable = {
  headers: string[];
  rows: Record<string, string>[];
};

function uniquifyHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header) => {
    const count = (seen.get(header) ?? 0) + 1;
    seen.set(header, count);
    return count === 1 ? header : `${header}_${count}`;
  });
}

export function normalizeHeader(value: string): string {
  return fold(value)
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_|_$/g, "");
}

function detectDelimiter(headerLine: string): "," | ";" {
  return (headerLine.match(/;/g)?.length ?? 0) >= (headerLine.match(/,/g)?.length ?? 0) ? ";" : ",";
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      quoted = !quoted;
      current += char;
      continue;
    }
    if (char === "\n" && !quoted) {
      lines.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) lines.push(current);
  return lines;
}

export function csvLineList(text: string): string[] {
  return splitCsvLines(text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
}

function splitCsvRow(line: string, delimiter: "," | ";"): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

export function parseCsv(text: string): CsvTable {
  const raw = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  if (!raw) return { headers: [], rows: [] };
  const lines = splitCsvLines(raw);
  if (lines.length === 0) return { headers: [], rows: [] };
  const delimiter = detectDelimiter(lines[0] ?? "");
  const headers = uniquifyHeaders(splitCsvRow(lines[0] ?? "", delimiter).map(normalizeHeader));
  const rows = lines.slice(1).flatMap((line) => {
    if (!line.trim()) return [];
    const cells = splitCsvRow(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    if (Object.values(row).every((value) => !value)) return [];
    return [row];
  });
  return { headers, rows };
}

export function pick(row: Record<string, string>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    const value = row[key];
    if (value) return value;
  }
  return "";
}
