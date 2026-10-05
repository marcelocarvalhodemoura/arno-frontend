export type ProofStatus = "waiting" | "matched" | "already" | "review" | "rejected" | "discarded";

export type Proof = {
  id: string;
  phone: string;
  senderName: string;
  memberIds: string[];
  members: { id: string; name: string; branch: string }[];
  status: ProofStatus;
  reason: string;
  kind: string;
  source: string;
  amount: number;
  date: string;
  e2e: string;
  bank: string;
  payerName: string;
  payerDocument: string;
  payeeName: string;
  payeeDocument: string;
  caption: string;
  fileKey?: string;
  fileName?: string;
  creditId?: string;
  credit?: { id: string; date: string; amount: number; description: string };
  createdAt: string;
};

export type CandidateCredit = { id: string; date: string; amount: number; description: string };

export type OpenMensalidade = {
  transactionId: string;
  yearMonth: string;
  year: number;
  month: number;
  dueDate: string;
  status: "pending" | "overdue";
  onTimeAmount: number;
  lateAmount: number;
  memberId?: string;
  memberName?: string;
};

export type Candidates = { credits: CandidateCredit[]; open: OpenMensalidade[] };

export const STATUS_LABEL: Record<ProofStatus, { label: string; badge: string }> = {
  review: { label: "Para conferir", badge: "watch" },
  waiting: { label: "Aguardando extrato", badge: "pending" },
  matched: { label: "Baixado", badge: "paid" },
  already: { label: "Já registrado", badge: "ok" },
  rejected: { label: "Outra conta", badge: "rejected" },
  discarded: { label: "Descartado", badge: "inactive" },
};

export const KIND_LABEL: Record<string, string> = {
  pix: "Pix",
  ted: "TED/DOC",
  boleto: "Boleto",
  deposito: "Depósito",
  nota_fiscal: "Nota fiscal",
  outro: "Outro",
};

/** WhatsApp manda 55 + DDD + número, às vezes sem o nono dígito. */
export function displayPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  return phone;
}
