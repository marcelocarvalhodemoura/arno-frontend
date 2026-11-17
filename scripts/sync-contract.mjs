#!/usr/bin/env node
/**
 * Copia o contrato compartilhado do backend (arno-backend/src/contract) para src/contract.
 *
 *   npm run sync:contract            # copia (backend em ../arno-backend ou em ARNO_BACKEND_DIR)
 *   npm run sync:contract -- --check # confere: cópia íntegra (hash) e, se o backend estiver presente, igual a ele
 *
 * Cada arquivo gerado leva o hash do conteúdo: editar a cópia à mão quebra a conferência (e o teste unitário).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src", "contract");
const backend = resolve(root, process.env.ARNO_BACKEND_DIR ?? "../arno-backend");
const source = join(backend, "src", "contract");
const check = process.argv.includes("--check");

export const HEADER =
  /^\/\/ GERADO a partir de arno-backend\/src\/contract\/(\S+) — não edite\.\n\/\/ sha256: ([0-9a-f]{64})\n/;

const hash = (body) => createHash("sha256").update(body).digest("hex");
const render = (file, body) =>
  `// GERADO a partir de arno-backend/src/contract/${file} — não edite.\n// sha256: ${hash(body)}\n${body}`;

function sourceFiles() {
  return readdirSync(source)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".spec.ts"))
    .sort();
}

function verifyCopies() {
  const problems = [];
  if (!existsSync(target)) return ["src/contract não existe: rode npm run sync:contract"];
  for (const file of readdirSync(target).filter((item) => item.endsWith(".ts"))) {
    const text = readFileSync(join(target, file), "utf8");
    const match = HEADER.exec(text);
    if (!match) problems.push(`${file}: sem cabeçalho de arquivo gerado`);
    else if (hash(text.slice(match[0].length)) !== match[2]) problems.push(`${file}: editado à mão (hash não confere)`);
  }
  return problems;
}

if (check) {
  const problems = verifyCopies();
  if (existsSync(source)) {
    const expected = sourceFiles();
    const actual = existsSync(target)
      ? readdirSync(target)
          .filter((item) => item.endsWith(".ts"))
          .sort()
      : [];
    if (expected.join() !== actual.join()) problems.push(`arquivos diferentes do backend: ${expected.join(", ")}`);
    for (const file of expected) {
      const wanted = render(file, readFileSync(join(source, file), "utf8"));
      const path = join(target, file);
      if (!existsSync(path) || readFileSync(path, "utf8") !== wanted)
        problems.push(`${file}: desatualizado em relação ao backend`);
    }
  } else {
    console.log(`Backend não encontrado em ${backend}: conferindo só a integridade da cópia.`);
  }
  if (problems.length) {
    console.error(["Contrato compartilhado com problema:", ...problems.map((item) => `  - ${item}`)].join("\n"));
    process.exit(1);
  }
  console.log("Contrato compartilhado conferido.");
  process.exit(0);
}

if (!existsSync(source)) {
  console.error(`Não achei ${source}. Defina ARNO_BACKEND_DIR com o caminho do arno-backend.`);
  process.exit(1);
}
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const file of sourceFiles()) {
  writeFileSync(join(target, file), render(file, readFileSync(join(source, file), "utf8")));
}
console.log(`Contrato copiado de ${source} (${sourceFiles().length} arquivos).`);
