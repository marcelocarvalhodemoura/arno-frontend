import type { ReportGroupBy, TxType } from "@/domain";

export type ReportKind = "custom" | "assembly" | "delinquency" | "link";

export const REPORT_GROUPS = [
  "Prestar contas",
  "Acompanhar o caixa",
  "Ramos e associados",
  "Conferir",
  "Montar relatório",
] as const;

export type ReportDef = {
  id: string;
  kind: ReportKind;
  group: (typeof REPORT_GROUPS)[number];
  label: string;
  /** Uma linha no catálogo: para que serve. */
  summary: string;
  /** Texto do papel timbrado: finalidade do documento. */
  purpose: string;
  documentTitle: string;
  csvPrefix: string;
  groupBy?: ReportGroupBy;
  /** Abas "Ver por" (a primeira é a padrão); sem abas, o agrupamento é fixo. */
  views?: ReportGroupBy[];
  /** Direção fixa do relatório (Entradas ou Saídas); vazio = escolhe na tela. */
  types?: TxType[];
  /** Mostra a escolha Entradas e saídas / Só entradas / Só saídas. */
  chooseDirection?: boolean;
  /** Tipos de movimentação já filtrados, pelo nome (ex.: "A identificar"). */
  presetTypeNames?: string[];
  showSignatures?: boolean;
  /** Livro-caixa detalhado aparece por padrão (a comissão fiscal precisa dele). */
  ledgerByDefault?: boolean;
  /** Relatório que tem tela própria: o catálogo leva até ela. */
  to?: string;
  /** Montador: passos numerados, filtro por associado e modelos salvos. */
  builder?: boolean;
};

export const REPORTS: ReportDef[] = [
  {
    id: "assembly",
    kind: "assembly",
    group: "Prestar contas",
    label: "Assembleia",
    summary: "Saldos, para onde foi cada real e quem está devendo.",
    purpose: "Prestação de contas à assembleia",
    documentTitle: "Prestação de contas",
    csvPrefix: "prestacao-contas-arno",
    showSignatures: true,
  },
  {
    id: "fiscal",
    kind: "custom",
    group: "Prestar contas",
    label: "Comissão fiscal",
    summary: "Livro-caixa numerado, com saldo acumulado e assinaturas.",
    purpose: "Prestação de contas à comissão fiscal",
    documentTitle: "Livro-caixa",
    csvPrefix: "livro-caixa-arno",
    groupBy: "movementType",
    showSignatures: true,
    ledgerByDefault: true,
  },
  {
    id: "movements",
    kind: "custom",
    group: "Acompanhar o caixa",
    label: "O que entrou e saiu",
    summary: "Totais do período por tipo de movimentação ou meio de pagamento.",
    purpose: "Entradas e saídas do período",
    documentTitle: "Entradas e saídas",
    csvPrefix: "entradas-saidas-arno",
    groupBy: "movementType",
    views: ["movementType", "method"],
    chooseDirection: true,
  },
  {
    id: "monthly",
    kind: "custom",
    group: "Acompanhar o caixa",
    label: "Evolução mensal",
    summary: "Entradas, saídas e resultado mês a mês.",
    purpose: "Evolução mensal do caixa",
    documentTitle: "Evolução mensal",
    csvPrefix: "mensal-arno",
    groupBy: "month",
  },
  {
    id: "branches",
    kind: "link",
    group: "Ramos e associados",
    label: "Extrato dos ramos",
    summary: "Quanto cada ramo recebeu e gastou, mês a mês.",
    purpose: "",
    documentTitle: "",
    csvPrefix: "",
    to: "/extrato-ramos",
  },
  {
    id: "byMember",
    kind: "custom",
    group: "Ramos e associados",
    label: "Pagamentos por associado",
    summary: "Quanto cada associado pagou no período.",
    purpose: "Pagamentos por associado",
    documentTitle: "Pagamentos por associado",
    csvPrefix: "por-associado-arno",
    groupBy: "member",
    types: ["income"],
  },
  {
    id: "delinquency",
    kind: "delinquency",
    group: "Ramos e associados",
    label: "Quem está devendo",
    summary: "Mensalidades vencidas por associado, para cobrar.",
    purpose: "Relatório de inadimplência de mensalidades",
    documentTitle: "Inadimplência",
    csvPrefix: "inadimplencia-arno",
  },
  {
    id: "conference",
    kind: "link",
    group: "Conferir",
    label: "Conferência das mensalidades",
    summary: "Pagamentos fora da tabela, divisões a confirmar e sem associado.",
    purpose: "",
    documentTitle: "",
    csvPrefix: "",
    to: "/conferencia",
  },
  {
    id: "unidentified",
    kind: "custom",
    group: "Conferir",
    label: "Lançamentos a identificar",
    summary: "O que entrou ou saiu sem tipo definido, para classificar.",
    purpose: "Lançamentos a identificar",
    documentTitle: "Lançamentos a identificar",
    csvPrefix: "a-identificar-arno",
    groupBy: "none",
    presetTypeNames: ["A identificar"],
    ledgerByDefault: true,
  },
  {
    id: "builder",
    kind: "custom",
    group: "Montar relatório",
    label: "Relatório personalizado",
    summary: "Escolha período, agrupamento e filtros; salve como modelo para repetir.",
    purpose: "Relatório personalizado",
    documentTitle: "Relatório personalizado",
    csvPrefix: "personalizado-arno",
    groupBy: "movementType",
    builder: true,
  },
];

/** Modelos antigos (links salvos) → modelo atual. */
const LEGACY_REPORT_IDS: Record<string, { id: string; types?: TxType[]; groupBy?: ReportGroupBy }> = {
  income: { id: "movements", types: ["income"] },
  expense: { id: "movements", types: ["expense"] },
  byMovementType: { id: "movements" },
  byMethod: { id: "movements", groupBy: "method" },
  byNature: { id: "movements" },
  byAccount: { id: "movements" },
  byBranch: { id: "branches" },
};

/** Modelo pelo id da URL (aceita os antigos); sem id ou desconhecido, o primeiro. */
export function reportFromParam(param: string | null): {
  report: ReportDef;
  types?: TxType[];
  groupBy?: ReportGroupBy;
} {
  const legacy = param ? LEGACY_REPORT_IDS[param] : undefined;
  const id = legacy?.id ?? param;
  const report = REPORTS.find((item) => item.id === id) ?? REPORTS[0]!;
  return { report, types: legacy?.types, groupBy: legacy?.groupBy };
}

export const GROUP_BY_LABELS: Record<ReportGroupBy, string> = {
  none: "Lançamento a lançamento",
  month: "Mês",
  branch: "Ramo",
  movementType: "Tipo de movimentação",
  nature: "Natureza",
  account: "Titular da conta",
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
