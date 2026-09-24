import { formatSplitBeneficiaries, type SplitPeerSummary } from "./split-description";

export type SplitDisplayPart = SplitPeerSummary & {
  movementTypeName?: string | null;
  date?: string;
  paidAt?: string | null;
  type?: "income" | "expense";
};

export type CashFlowDisplayRow =
  | { kind: "single"; id: string; txId: string }
  | {
      kind: "split";
      id: string;
      groupId: string;
      /** IDs das partes, ordenadas. */
      partIds: string[];
      total: number;
      type: "income" | "expense";
      date: string;
      paidAt?: string | null;
      label: string;
      beneficiaries: string;
      partCount: number;
      /** Abrir sanfona porque a busca/filtro casou com o grupo. */
      forceExpand: boolean;
    };

/** Remove sufixo automático de rateio para o título da linha agregada. */
export function splitGroupLabel(parts: { description: string; splitIndex?: number }[]): string {
  if (!parts.length) return "Rateio";
  const first = [...parts].sort((a, b) => (a.splitIndex ?? 0) - (b.splitIndex ?? 0))[0];
  const raw = first.description.trim();
  const withMember = raw.match(/^.+?\s·\sparte\s+\d+\/\d+\s·\sR\$\s[\d.,]+\sde\sR\$\s[\d.,]+\s·\s(.+)$/i);
  if (withMember?.[1]?.trim()) return withMember[1].trim();
  const withoutMember = raw.match(/^(.+?)\s·\sparte\s+\d+\/\d+\s·\sR\$\s[\d.,]+\sde\sR\$\s[\d.,]+$/i);
  if (withoutMember?.[1]?.trim()) return withoutMember[1].trim();
  return raw || "Rateio";
}

type MatchableTx = {
  id: string;
  splitGroupId?: string;
  splitTotal?: number;
  splitIndex?: number;
  splitCount?: number;
  amount: number;
  type: "income" | "expense";
  date: string;
  paidAt?: string;
  description: string;
  memberName?: string | null;
  movementTypeName?: string | null;
};

/**
 * Agrupa lançamentos com o mesmo splitGroupId em uma linha de sanfona.
 * Um grupo entra na lista se qualquer parte estiver em `matchedIds`.
 * `forceExpand` quando há termo de busca ativo e o grupo foi incluído.
 */
export function buildCashFlowDisplayRows(
  source: MatchableTx[],
  matchedIds: Set<string>,
  searchActive: boolean,
): CashFlowDisplayRow[] {
  const byGroup = new Map<string, MatchableTx[]>();
  for (const tx of source) {
    if (!tx.splitGroupId) continue;
    const list = byGroup.get(tx.splitGroupId) ?? [];
    list.push(tx);
    byGroup.set(tx.splitGroupId, list);
  }
  for (const list of byGroup.values()) {
    list.sort((a, b) => (a.splitIndex ?? 0) - (b.splitIndex ?? 0) || a.id.localeCompare(b.id));
  }

  const ordered = [...source].sort(
    (a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description) || a.id.localeCompare(b.id),
  );
  const seenGroups = new Set<string>();
  const rows: CashFlowDisplayRow[] = [];

  for (const tx of ordered) {
    if (tx.splitGroupId) {
      if (seenGroups.has(tx.splitGroupId)) continue;
      seenGroups.add(tx.splitGroupId);
      const parts = byGroup.get(tx.splitGroupId) ?? [tx];
      if (!parts.some((part) => matchedIds.has(part.id))) continue;
      const total = parts[0].splitTotal ?? parts.reduce((sum, part) => sum + part.amount, 0);
      const peers: SplitPeerSummary[] = parts.map((part) => ({
        id: part.id,
        amount: part.amount,
        splitIndex: part.splitIndex,
        memberName: part.memberName ?? null,
        description: part.description,
      }));
      rows.push({
        kind: "split",
        id: `split:${tx.splitGroupId}`,
        groupId: tx.splitGroupId,
        partIds: parts.map((part) => part.id),
        total,
        type: parts[0].type,
        date: parts[0].date,
        paidAt: parts.find((part) => part.paidAt)?.paidAt ?? parts[0].paidAt,
        label: splitGroupLabel(parts),
        beneficiaries: formatSplitBeneficiaries(peers),
        partCount: parts[0].splitCount ?? parts.length,
        forceExpand: searchActive,
      });
      continue;
    }
    if (!matchedIds.has(tx.id)) continue;
    rows.push({ kind: "single", id: tx.id, txId: tx.id });
  }

  return rows;
}
