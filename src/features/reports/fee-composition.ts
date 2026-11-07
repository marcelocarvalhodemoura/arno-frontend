import { BRANCH_LABELS, type BranchId, type PaidFeeComposition } from "@/domain";

export type CompositionRowKind = "destination" | "part" | "total";

export interface CompositionRow {
  kind: CompositionRowKind;
  label: string;
  /** Para onde vai a parte (só nas linhas de destino). */
  note?: string;
  amount: number;
}

/**
 * Linhas do quadro "Composição das mensalidades recebidas": cada destino com o seu total
 * e, abaixo, as partes que o formam. Linhas zeradas ficam de fora; a soma dos destinos é o total recebido.
 */
export function compositionRows(data: PaidFeeComposition): CompositionRow[] {
  const t = data.totals;
  const rows: CompositionRow[] = [];
  const parts = (items: [string, number][]) => {
    for (const [label, amount] of items) {
      if (Math.abs(amount) >= 0.005) rows.push({ kind: "part", label, amount });
    }
  };

  rows.push({ kind: "destination", label: "Caixa do grupo", note: "Fica no grupo", amount: t.groupCash });
  parts([
    ["Operacional", t.group],
    ["Diluição dez/jan/fev", t.dilution],
    ["Acréscimo por atraso", t.lateFee],
    ["Parcela de dívida", t.arrears],
  ]);

  rows.push({ kind: "destination", label: "Caixinhas dos ramos", note: "Saldo de cada ramo", amount: t.branch });
  parts(data.byBranch.map((row) => [BRANCH_LABELS[row.memberBranch as BranchId] ?? row.memberBranch, row.branch]));

  rows.push({ kind: "destination", label: "Fundo do lanche", amount: t.snack });
  rows.push({ kind: "destination", label: "Taxa do clube", note: "A repassar ao Lindóia", amount: t.club });

  if (Math.abs(t.difference) >= 0.005) {
    rows.push({
      kind: "destination",
      label: t.difference > 0 ? "Recebido a mais que a tabela" : "Recebido a menos que a tabela",
      note: "A conferir",
      amount: t.difference,
    });
  }
  if (data.unlinked.count) {
    rows.push({
      kind: "destination",
      label: `Sem divisão (${data.unlinked.count} sem associado)`,
      note: "A conferir",
      amount: data.unlinked.amount,
    });
  }

  rows.push({ kind: "total", label: "Mensalidades recebidas", amount: data.total });
  return rows.filter((row) => row.kind !== "destination" || Math.abs(row.amount) >= 0.005);
}
