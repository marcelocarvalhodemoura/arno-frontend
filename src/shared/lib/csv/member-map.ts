import { onTimeMonthlyFee, type YouthBranchId } from "@/domain";
import { fold } from "@/shared/lib/csv/fold";
import { pick } from "@/shared/lib/csv/parser";
import type { MapOk, MapResult, MemberImportRow } from "@/shared/lib/csv/types";
import { optionalContactEmail, parseBranch, parseIsoDate, parseRelationship, parseRole, parseYesNo } from "@/shared/lib/csv/values";

type GuardianImport = NonNullable<MemberImportRow["guardians"]>[number];

function pickGuardian(row: Record<string, string>, slot: number): GuardianImport[] {
  const suffix = slot === 1 ? "" : `_${slot}`;
  const alt = `_${slot}`;
  const name = pick(
    row,
    `responsavel${suffix}`,
    `nome_responsavel${suffix}`,
    `responsavel${alt}`,
    `nome_responsavel${alt}`,
    `resp${alt}`,
    slot === 1 ? "guardian" : `guardian_${slot}`,
    slot === 1 ? "responsaveis" : "",
    slot === 2 ? "resp2" : "",
  );
  if (name.length < 2) return [];
  const relationship = pick(
    row,
    `parentesco${suffix}`,
    `parentesco${alt}`,
    `parent${suffix}`,
    `parent${alt}`,
    `grau_parentesco${suffix}`,
    `grau_parentesco${alt}`,
    slot === 1 ? "relacao" : `relacao_${slot}`,
    slot === 1 ? "parentescos" : "",
    slot === 2 ? "parent2" : "",
  );
  const phone = pick(
    row,
    `telefone_responsavel${suffix}`,
    `telefone_responsavel${alt}`,
    `telefone${alt}`,
    slot === 1 ? "telefone2" : "",
    slot === 2 ? "telefone3" : "",
    `fone_responsavel${suffix}`,
    `celular_responsavel${suffix}`,
  );
  const email = pick(
    row,
    `email_responsavel${suffix}`,
    `email_responsavel${alt}`,
    `email${alt}`,
    slot === 1 ? "email2" : "",
  );
  return peopleFromCell(name, relationship, phone, email);
}

function splitPeople(raw: string): string[] {
  return raw
    .split(/\s*[;|/]\s*|\s+ e \s+/i)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function personFromToken(raw: string, fallback: string): GuardianImport | null {
  const trimmed = raw.trim();
  if (trimmed.length < 2) return null;
  const withRel = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (withRel) {
    return {
      name: withRel[1]!.trim(),
      relationship: parseRelationship(withRel[2]!),
      phone: "",
      email: "",
    };
  }
  return {
    name: trimmed,
    relationship: parseRelationship(fallback),
    phone: "",
    email: "",
  };
}

function peopleFromCell(nameRaw: string, relationshipRaw: string, phone = "", email = ""): GuardianImport[] {
  const names = splitPeople(nameRaw);
  if (!names.length) return [];
  const relKey = fold(relationshipRaw);
  const relParts =
    relKey === "mae e pai" || relKey === "pais" || relKey === "pai e mae"
      ? names.map((_, index) => (index === 0 ? "Mãe" : "Pai"))
      : splitPeople(relationshipRaw);
  return names.flatMap((name, index) => {
    const person = personFromToken(name, relParts[index] ?? relationshipRaw);
    if (!person) return [];
    if (index === 0) {
      person.phone = phone;
      person.email = optionalContactEmail(email);
    }
    return [person];
  });
}

export function mergeGuardianLists(...groups: Array<GuardianImport[] | undefined>): GuardianImport[] {
  const next: GuardianImport[] = [];
  for (const group of groups) {
    for (const item of group ?? []) {
      const hit = next.find((guardian) => fold(guardian.name) === fold(item.name));
      if (hit) {
        if (!hit.relationship || hit.relationship === "Outro") hit.relationship = item.relationship;
        if (!hit.phone) hit.phone = item.phone;
        if (!hit.email) hit.email = item.email;
        continue;
      }
      next.push({ ...item });
    }
  }
  return next;
}

function collectGuardians(row: Record<string, string>): GuardianImport[] | undefined {
  const mother = pick(row, "mae", "nome_mae", "nome_da_mae", "mae_nome", "nome_da_mae");
  const father = pick(row, "pai", "nome_pai", "nome_do_pai", "pai_nome", "nome_do_pai");
  const fromParents: GuardianImport[] = [];
  if (mother.length >= 2) {
    fromParents.push({
      name: mother,
      relationship: "Mãe",
      phone: pick(row, "telefone_mae", "celular_mae", "fone_mae", "telefone_da_mae"),
      email: optionalContactEmail(pick(row, "email_mae", "email_da_mae")),
    });
  }
  if (father.length >= 2) {
    fromParents.push({
      name: father,
      relationship: "Pai",
      phone: pick(row, "telefone_pai", "celular_pai", "fone_pai", "telefone_do_pai"),
      email: optionalContactEmail(pick(row, "email_pai", "email_do_pai")),
    });
  }
  const fromSlots = [1, 2, 3, 4].flatMap((slot) => pickGuardian(row, slot));
  const list = mergeGuardianLists(fromParents, fromSlots);
  return list.length ? list : undefined;
}

export function collapseMappedMembers(
  rows: { line: number; mapped: MapResult<MemberImportRow> }[],
): { line: number; mapped: MapResult<MemberImportRow> }[] {
  const merged = new Map<string, { line: number; mapped: MapOk<MemberImportRow> }>();
  const leftovers: { line: number; mapped: MapResult<MemberImportRow> }[] = [];
  for (const row of rows) {
    if (!row.mapped.ok) {
      leftovers.push(row);
      continue;
    }
    const key = `${fold(row.mapped.value.name)}|${row.mapped.value.branch}|${row.mapped.value.email.toLowerCase()}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { line: row.line, mapped: { ok: true, value: { ...row.mapped.value } } });
      continue;
    }
    current.mapped.value.guardians = mergeGuardianLists(current.mapped.value.guardians, row.mapped.value.guardians);
  }
  return [...merged.values(), ...leftovers].sort((a, b) => a.line - b.line);
}

function memberNameOf(row: Record<string, string>) {
  return pick(
    row,
    "associado",
    "jovem",
    "nome_do_jovem",
    "nome_associado",
    "nome_do_associado",
    "nome",
    "name",
  );
}

function memberEmailOf(row: Record<string, string>) {
  return pick(
    row,
    "email",
    "e-mail",
    "email_associado",
    "email_do_jovem",
    "mail",
    "email_responsavel",
    "email_mae",
    "email_pai",
  );
}

function memberPhoneOf(row: Record<string, string>) {
  return pick(
    row,
    "telefone",
    "phone",
    "celular",
    "whatsapp",
    "fone",
    "telefone_associado",
    "telefone_responsavel",
    "celular_responsavel",
    "telefone_mae",
    "telefone_pai",
    "telefone2",
    "telefone3",
  );
}

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function slugName(value: string) {
  return fold(value).replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "associado";
}

function ensureMemberEmail(raw: string, name: string, branch: YouthBranchId, used: Set<string>) {
  const preferred = raw.toLowerCase().trim();
  if (preferred.includes("@") && !used.has(preferred)) {
    used.add(preferred);
    return preferred;
  }
  let candidate = `import.${slugName(name)}.${branch}@arnofriedrich.org.br`;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `import.${slugName(name)}.${branch}${index}@arnofriedrich.org.br`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function mapMemberCluster(rows: Record<string, string>[], usedEmails: Set<string>): MapResult<MemberImportRow> {
  const merged: Record<string, string> = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (value && !merged[key]) merged[key] = value;
    }
  }
  const name = memberNameOf(merged);
  const roleRaw = pick(merged, "papel", "funcao", "role");
  const ramoRaw = pick(merged, "ramo", "branch", "secao");
  const ramoKey = fold(ramoRaw).replace(/\s+/g, " ");
  let role = roleRaw ? parseRole(roleRaw) : "jovem";
  let branch = parseBranch(ramoRaw, false) as YouthBranchId | null;
  if (["diretoria", "direcao"].includes(ramoKey)) {
    branch = "flor-de-lis";
    role = "dirigente";
  }
  const dateRaw = pick(merged, "ingresso", "joined_at", "data_ingresso", "data_cadastro", "data");
  const joinedAt = dateRaw ? parseIsoDate(dateRaw) : todayIso();
  const ltcRaw = pick(merged, "clube_ltc", "clube_l", "ltc", "clube");
  const clubeLtc = ltcRaw ? parseYesNo(ltcRaw) : false;
  const guardians = mergeGuardianLists(...rows.map((row) => collectGuardians(row)));
  let phone = memberPhoneOf(merged);
  if (phone.replace(/\D/g, "").length < 8) {
    phone = guardians.find((item) => item.phone.replace(/\D/g, "").length >= 8)?.phone ?? phone;
  }

  if (name.length < 2) return { ok: false, error: "Informe o nome" };
  if (!branch) return { ok: false, error: "Ramo inválido" };
  if (!role) return { ok: false, error: "Papel inválido" };
  if (!joinedAt) return { ok: false, error: "Data de ingresso inválida" };
  if (clubeLtc === null) return { ok: false, error: "Clube LTC deve ser sim ou não" };
  if (phone.replace(/\D/g, "").length < 8) return { ok: false, error: "Telefone inválido" };

  const email = ensureMemberEmail(memberEmailOf(merged), name, branch, usedEmails);

  return {
    ok: true,
    value: {
      name,
      email,
      phone,
      branch,
      role,
      monthlyFee: onTimeMonthlyFee({ branch, clubeLtc }),
      joinedAt,
      clubeLtc,
      guardians: guardians.length ? guardians : undefined,
    },
  };
}

export function mapMemberRow(row: Record<string, string>): MapResult<MemberImportRow> {
  return mapMemberCluster([row], new Set());
}

export function mapMemberTable(rows: Record<string, string>[]): { line: number; mapped: MapResult<MemberImportRow> }[] {
  const groups = new Map<string, { line: number; rows: Record<string, string>[] }>();
  rows.forEach((row, index) => {
    const name = memberNameOf(row);
    const branchKey = fold(pick(row, "ramo", "branch", "secao")) || "_";
    const key = name.length >= 2 ? `${fold(name)}|${branchKey}` : `row:${index}`;
    const current = groups.get(key);
    if (current) {
      current.rows.push(row);
      return;
    }
    groups.set(key, { line: index + 2, rows: [row] });
  });
  const usedEmails = new Set<string>();
  return [...groups.values()].map((group) => ({
    line: group.line,
    mapped: mapMemberCluster(group.rows, usedEmails),
  }));
}
