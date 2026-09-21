import {
  GUARDIAN_RELATIONSHIPS,
  type BranchId,
  type GuardianRelationship,
  type MemberRole,
  type PaymentMethod,
  type TxNature,
  type TxPaymentStatus,
  type TxType,
} from "@/domain";
import { fold } from "@/shared/lib/csv/fold";
import { parseMoney } from "@/shared/lib/masks";

export function parseIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return trimmed;
  const br = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (br) {
    const day = br[1]!.padStart(2, "0");
    const month = br[2]!.padStart(2, "0");
    const year = br[3]!;
    const stamp = `${year}-${month}-${day}`;
    const date = new Date(`${stamp}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return stamp;
  }
  const serial = Number(trimmed.replace(",", "."));
  if (Number.isFinite(serial) && serial >= 20000 && serial < 80000) {
    const utc = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000;
    return new Date(utc).toISOString().slice(0, 10);
  }
  return null;
}

export function optionalContactEmail(value: string): string {
  const trimmed = value.trim().replace(/^mailto:/i, "");
  if (!trimmed) return "";
  const candidate =
    trimmed
      .split(/[\s;,/]+/)
      .map((part) => part.replace(/,+/g, ".").replace(/^\.|\.$/g, ""))
      .find((part) => part.includes("@")) ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return "";
  return candidate;
}

export function parseAmountCell(value: string): number {
  const trimmed = value.trim().replace(/^r\$\s*/i, "");
  return parseMoney(trimmed);
}

export function parseYesNo(value: string): boolean | null {
  const key = fold(value);
  if (["sim", "yes", "true", "1", "s"].includes(key)) return true;
  if (["nao", "não", "no", "false", "0", "n"].includes(key)) return false;
  return null;
}

export function parseBranch(value: string, allowGrupo = false): BranchId | null {
  const key = fold(value).replace(/\s+/g, " ");
  const map: Record<string, BranchId> = {
    filhote: "filhote",
    filhotes: "filhote",
    "ramo filhotes": "filhote",
    "ramo filhote": "filhote",
    lobinho: "lobinho",
    lobinhos: "lobinho",
    alcateia: "lobinho",
    "ramo lobinho": "lobinho",
    escoteiro: "escoteiro",
    escoteiros: "escoteiro",
    escoteira: "escoteiro",
    tropa: "escoteiro",
    "tropa escoteira": "escoteiro",
    "ramo escoteiro": "escoteiro",
    senior: "senior",
    seniores: "senior",
    "tropa senior": "senior",
    "ramo senior": "senior",
    pioneiro: "pioneiro",
    pioneiros: "pioneiro",
    pioneira: "pioneiro",
    "cla pioneiro": "pioneiro",
    cla: "pioneiro",
    "ramo pioneiro": "pioneiro",
    "flor-de-lis": "flor-de-lis",
    "flor de lis": "flor-de-lis",
    cfl: "flor-de-lis",
    clube: "flor-de-lis",
    ltc: "flor-de-lis",
    diretoria: "flor-de-lis",
    direcao: "flor-de-lis",
  };
  if (allowGrupo) {
    map.grupo = "grupo";
    map["grupo escoteiro"] = "grupo";
  }
  return map[key] ?? null;
}

export function parseRole(value: string): MemberRole | null {
  const key = fold(value);
  if (!key) return "jovem";
  if (["jovem", "associado", "beneficiario", "aluno", "crianca"].includes(key)) return "jovem";
  if (["escotista", "chefe", "chefe de secao", "adulto", "adulta", "adultos", "adultas"].includes(key)) {
    return "escotista";
  }
  if (["dirigente", "diretoria", "tesoureiro", "admin"].includes(key)) return "dirigente";
  if (key === "clube") return "clube";
  return null;
}

export function parseTxType(value: string): TxType | null {
  const key = fold(value);
  if (["entrada", "income", "credito", "c", "cr"].includes(key)) return "income";
  if (["saida", "expense", "debito", "d", "db"].includes(key)) return "expense";
  return null;
}

export function parseNature(value: string): TxNature | null {
  const key = fold(value);
  if (["fixa", "fixed"].includes(key)) return "fixed";
  if (["variavel", "variable"].includes(key)) return "variable";
  return null;
}

export function parseMethod(value: string): PaymentMethod | null {
  const key = fold(value);
  if (key === "pix") return "pix";
  if (["dinheiro", "cash", "especie"].includes(key)) return "cash";
  if (["transferencia", "transfer", "ted", "doc"].includes(key)) return "transfer";
  if (["cartao", "card", "credito", "debito"].includes(key)) return "card";
  if (["outro", "other"].includes(key)) return "other";
  return null;
}

export function parsePaymentStatus(value: string): TxPaymentStatus | null {
  const key = fold(value);
  if (!key || ["pago", "paid", "conciliado"].includes(key)) return "paid";
  if (["pendente", "pending"].includes(key)) return "pending";
  return null;
}

export function parseRelationship(value: string): GuardianRelationship {
  const key = fold(value).replace(/[_-]+/g, " ");
  const exact = GUARDIAN_RELATIONSHIPS.find((item) => fold(item) === key);
  if (exact) return exact;
  if (["mamae", "genitora", "mae do jovem"].includes(key)) return "Mãe";
  if (["papai", "genitor", "pai do jovem"].includes(key)) return "Pai";
  if (key.includes("legal")) return "Responsável legal";
  return value.trim().length >= 2 ? "Outro" : "Outro";
}
