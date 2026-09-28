import type { CashFlowDisplayRow } from "@/features/cash-flow/split-display";
import { BRANCH_LABELS, type BranchId, type MovementType, type Transaction, type TxNature } from "@/domain";
import { dueDateOf, natureLabel, paidDateOf, settlementOf, type TxSettlement } from "@/shared/lib/format";
import { compareNumber, compareText, type SortDir } from "@/shared/ui/SortableTh";

export type CashFlowSortKey =
  "dueDate" | "paidDate" | "description" | "movementType" | "branch" | "nature" | "settlement" | "amount";

type TxLike = Transaction & {
  movementType: MovementType | null;
  member?: { name?: string } | null;
};

const SETTLEMENT_ORDER: Record<TxSettlement, number> = {
  overdue: 0,
  pending: 1,
  paid: 2,
};

function rowMeta(row: CashFlowDisplayRow, txById: Map<string, TxLike>) {
  if (row.kind === "single") {
    const tx = txById.get(row.txId);
    if (!tx) return null;
    const settlement = settlementOf(tx.paymentStatus, tx.date);
    return {
      dueDate: dueDateOf(tx),
      paidDate: paidDateOf(tx),
      description: tx.description,
      movementType: tx.movementType?.name ?? "",
      branch: BRANCH_LABELS[tx.branch as BranchId] ?? tx.branch,
      nature: natureLabel(tx.nature as TxNature),
      settlement,
      amount: tx.type === "income" ? tx.amount : -tx.amount,
    };
  }

  const parts = row.partIds.map((id) => txById.get(id)).filter((item): item is TxLike => Boolean(item));
  const head = parts[0];
  if (!head) return null;
  const settlement = settlementOf(head.paymentStatus, head.date);
  const mixedTypes = new Set(parts.map((p) => p.movementType?.name).filter(Boolean));
  const branches = [...new Set(parts.map((p) => BRANCH_LABELS[p.branch as BranchId] ?? p.branch))].join(" ");
  return {
    dueDate: dueDateOf(head),
    paidDate: paidDateOf(head),
    description: row.label,
    movementType: mixedTypes.size === 1 ? ([...mixedTypes][0] as string) : `${row.partCount} partes`,
    branch: branches,
    nature: natureLabel(head.nature as TxNature),
    settlement,
    amount: row.type === "income" ? row.total : -row.total,
  };
}

function compareMeta(
  a: NonNullable<ReturnType<typeof rowMeta>>,
  b: NonNullable<ReturnType<typeof rowMeta>>,
  key: CashFlowSortKey,
) {
  switch (key) {
    case "dueDate":
      return compareText(a.dueDate, b.dueDate);
    case "paidDate":
      return compareText(a.paidDate || "", b.paidDate || "");
    case "description":
      return compareText(a.description, b.description);
    case "movementType":
      return compareText(a.movementType, b.movementType);
    case "branch":
      return compareText(a.branch, b.branch);
    case "nature":
      return compareText(a.nature, b.nature);
    case "settlement":
      return SETTLEMENT_ORDER[a.settlement] - SETTLEMENT_ORDER[b.settlement];
    case "amount":
      return compareNumber(a.amount, b.amount);
    default:
      return 0;
  }
}

export function sortCashFlowDisplayRows(
  rows: CashFlowDisplayRow[],
  txById: Map<string, TxLike>,
  key: CashFlowSortKey,
  dir: SortDir,
): CashFlowDisplayRow[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const a = rowMeta(left, txById);
    const b = rowMeta(right, txById);
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    const primary = compareMeta(a, b, key);
    if (primary !== 0) return primary * factor;
    return compareText(left.id, right.id) * factor;
  });
}
