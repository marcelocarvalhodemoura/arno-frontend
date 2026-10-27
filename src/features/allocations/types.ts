import type { MensalidadeFormula } from "@/domain";

/** Divisão gravada no pagamento da mensalidade (espelho de MensalidadeAllocation do backend). */
export type MensalidadeAllocation = {
  transactionId: string;
  memberId: string;
  periodStart: string;
  source: MensalidadeFormula["source"];
  memberBranch: string;
  clubeLtc: boolean;
  late: boolean;
  clubFeeIncluded: boolean;
  group: number;
  branch: number;
  snack: number;
  club: number;
  dilution: number;
  lateFee: number;
  arrears: number;
  expected: number;
  received: number;
  difference: number;
  pendingSplit: boolean;
  computedAt: string;
};

export type AllocationDetail = {
  allocation: MensalidadeAllocation;
  description: string;
  groupCash: number;
  current: MensalidadeAllocation | null;
  currentDescription: string | null;
};

export type ConferenceIssueKind = "difference" | "pending_split" | "drift" | "unlinked";

export type ConferenceIssue = {
  kind: ConferenceIssueKind;
  transactionId: string;
  date: string;
  paidAt?: string;
  memberId?: string;
  memberName?: string;
  branch: string;
  amount: number;
  message: string;
  allocation?: MensalidadeAllocation;
  current?: MensalidadeAllocation;
};

export type DestinationTotals = {
  received: number;
  groupCash: number;
  group: number;
  branch: number;
  snack: number;
  club: number;
  dilution: number;
  lateFee: number;
  arrears: number;
  difference: number;
  count: number;
};

export type ConferenceReport = {
  year: number;
  totals: DestinationTotals;
  byBranch: (DestinationTotals & { memberBranch: string })[];
  counts: Record<ConferenceIssueKind, number>;
  issues: ConferenceIssue[];
};

export const ALLOCATION_PARTS: {
  key: "group" | "branch" | "snack" | "club" | "dilution" | "lateFee" | "arrears";
  label: string;
  destination: string;
}[] = [
  { key: "group", label: "Operacional", destination: "Caixa do grupo" },
  { key: "branch", label: "Caixinha do ramo", destination: "Ramo" },
  { key: "snack", label: "Lanche", destination: "Fundo do lanche" },
  { key: "club", label: "Taxa do clube", destination: "Repasse ao Lindóia" },
  { key: "dilution", label: "Diluição dez/jan/fev", destination: "Caixa do grupo" },
  { key: "lateFee", label: "Acréscimo por atraso", destination: "Caixa do grupo" },
  { key: "arrears", label: "Parcela de dívida", destination: "Caixa do grupo" },
];

export const ISSUE_LABELS: Record<ConferenceIssueKind, string> = {
  unlinked: "Sem associado",
  difference: "Valor diferente da tabela",
  drift: "Regra mudou depois",
  pending_split: "Divisão a confirmar",
};
