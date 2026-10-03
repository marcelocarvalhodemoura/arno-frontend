import type { ReportGroupBy, TxType } from "@/domain";

export type ReportKind = "custom" | "assembly" | "delinquency";

export type ReportDef = {
  id: string;
  kind: ReportKind;
  group: "Prestação de contas" | "Movimentação" | "Pessoas e ramos";
  label: string;
  /** Uma linha no catálogo: para que serve. */
  summary: string;
  /** Texto do papel timbrado: finalidade do documento. */
  purpose: string;
  documentTitle: string;
  csvPrefix: string;
  groupBy?: ReportGroupBy;
  /** Direção fixa do relatório (Entradas ou Saídas); vazio = as duas. */
  types?: TxType[];
  showSignatures?: boolean;
  /** Livro-caixa detalhado aparece por padrão (a comissão fiscal precisa dele). */
  ledgerByDefault?: boolean;
};

export const REPORTS: ReportDef[] = [
  {
    id: "fiscal",
    kind: "custom",
    group: "Prestação de contas",
    label: "Livro-caixa · comissão fiscal",
    summary: "Livro numerado com saldo acumulado e assinaturas.",
    purpose: "Prestação de contas à comissão fiscal",
    documentTitle: "Livro-caixa",
    csvPrefix: "livro-caixa-arno",
    groupBy: "movementType",
    showSignatures: true,
    ledgerByDefault: true,
  },
  {
    id: "assembly",
    kind: "assembly",
    group: "Prestação de contas",
    label: "Prestação de contas · assembleia",
    summary: "Saldos, ramos, principais tipos e inadimplência.",
    purpose: "Prestação de contas à assembleia",
    documentTitle: "Prestação de contas",
    csvPrefix: "prestacao-contas-arno",
    showSignatures: true,
  },
  {
    id: "income",
    kind: "custom",
    group: "Movimentação",
    label: "Entradas",
    summary: "Tudo o que entrou, por tipo de conta.",
    purpose: "Relatório de entradas",
    documentTitle: "Entradas",
    csvPrefix: "entradas-arno",
    groupBy: "movementType",
    types: ["income"],
  },
  {
    id: "expense",
    kind: "custom",
    group: "Movimentação",
    label: "Saídas",
    summary: "Tudo o que saiu, por tipo de conta.",
    purpose: "Relatório de saídas",
    documentTitle: "Saídas",
    csvPrefix: "saidas-arno",
    groupBy: "movementType",
    types: ["expense"],
  },
  {
    id: "byMovementType",
    kind: "custom",
    group: "Movimentação",
    label: "Por tipo de conta",
    summary: "Entradas e saídas de cada tipo de movimentação.",
    purpose: "Relatório por tipo de conta",
    documentTitle: "Por tipo de conta",
    csvPrefix: "por-tipo-arno",
    groupBy: "movementType",
  },
  {
    id: "monthly",
    kind: "custom",
    group: "Movimentação",
    label: "Evolução mensal",
    summary: "Entradas, saídas e resultado mês a mês.",
    purpose: "Evolução mensal do caixa",
    documentTitle: "Evolução mensal",
    csvPrefix: "mensal-arno",
    groupBy: "month",
  },
  {
    id: "byNature",
    kind: "custom",
    group: "Movimentação",
    label: "Fixas × variáveis",
    summary: "Quanto do caixa é recorrente e quanto é eventual.",
    purpose: "Relatório por natureza",
    documentTitle: "Fixas e variáveis",
    csvPrefix: "natureza-arno",
    groupBy: "nature",
  },
  {
    id: "byMethod",
    kind: "custom",
    group: "Movimentação",
    label: "Por meio de pagamento",
    summary: "Pix, dinheiro, cartão, transferência.",
    purpose: "Relatório por meio de pagamento",
    documentTitle: "Por meio de pagamento",
    csvPrefix: "meio-pagamento-arno",
    groupBy: "method",
  },
  {
    id: "byBranch",
    kind: "custom",
    group: "Pessoas e ramos",
    label: "Por ramo",
    summary: "Visão gerencial: mensalidade entra só com a caixinha.",
    purpose: "Relatório gerencial por ramo",
    documentTitle: "Por ramo",
    csvPrefix: "por-ramo-arno",
    groupBy: "branch",
  },
  {
    id: "byMember",
    kind: "custom",
    group: "Pessoas e ramos",
    label: "Por associado",
    summary: "Quanto cada associado pagou ou recebeu.",
    purpose: "Relatório por associado",
    documentTitle: "Por associado",
    csvPrefix: "por-associado-arno",
    groupBy: "member",
    types: ["income"],
  },
  {
    id: "byAccount",
    kind: "custom",
    group: "Pessoas e ramos",
    label: "Por conta (titular)",
    summary: "Movimentação pelo titular da conta vinculada.",
    purpose: "Relatório por conta",
    documentTitle: "Por conta",
    csvPrefix: "por-conta-arno",
    groupBy: "account",
  },
  {
    id: "delinquency",
    kind: "delinquency",
    group: "Pessoas e ramos",
    label: "Inadimplência",
    summary: "Mensalidades vencidas por associado, para cobrar.",
    purpose: "Relatório de inadimplência de mensalidades",
    documentTitle: "Inadimplência",
    csvPrefix: "inadimplencia-arno",
  },
];

export const REPORT_GROUPS = ["Prestação de contas", "Movimentação", "Pessoas e ramos"] as const;

export const GROUP_BY_LABELS: Record<ReportGroupBy, string> = {
  none: "Lançamento a lançamento",
  month: "Mês",
  branch: "Ramo",
  movementType: "Tipo de conta",
  nature: "Natureza (fixa/variável)",
  account: "Conta (titular)",
  member: "Associado",
  method: "Meio de pagamento",
};

/** Atalhos de período a partir de hoje. */
export function periodPresets(today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const monthStart = (year: number, month: number) => iso(new Date(Date.UTC(year, month, 1)));
  const monthEnd = (year: number, month: number) => iso(new Date(Date.UTC(year, month + 1, 0)));
  return [
    { id: "month", label: "Este mês", from: monthStart(y, m), to: monthEnd(y, m) },
    { id: "prev", label: "Mês anterior", from: monthStart(y, m - 1), to: monthEnd(y, m - 1) },
    { id: "ytd", label: "Ano até hoje", from: `${y}-01-01`, to: iso(today) },
    { id: "s1", label: `1º sem. ${y}`, from: `${y}-01-01`, to: `${y}-06-30` },
    { id: "s2", label: `2º sem. ${y}`, from: `${y}-07-01`, to: `${y}-12-31` },
    { id: "lastYear", label: `Ano ${y - 1}`, from: `${y - 1}-01-01`, to: `${y - 1}-12-31` },
  ];
}
