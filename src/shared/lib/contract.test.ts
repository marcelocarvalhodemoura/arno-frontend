import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(__dirname, "..", "..", "contract");
const HEADER =
  /^\/\/ GERADO a partir de arno-backend\/src\/contract\/(\S+) — não edite\.\n\/\/ sha256: ([0-9a-f]{64})\n/;

describe("contrato compartilhado com o backend", () => {
  const files = readdirSync(dir).filter((file) => file.endsWith(".ts"));

  it("existe", () => {
    expect(files).toEqual(expect.arrayContaining(["types.ts", "fee-rules.ts", "money.ts", "competencia.ts"]));
  });

  it.each(files)("%s não foi editado à mão (rode npm run sync:contract)", (file) => {
    const text = readFileSync(join(dir, file), "utf8");
    const match = HEADER.exec(text);
    expect(match?.[1]).toBe(file);
    const body = text.slice(match![0].length);
    expect(createHash("sha256").update(body).digest("hex")).toBe(match![2]);
  });
});
