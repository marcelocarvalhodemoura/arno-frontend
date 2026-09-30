import { isMensalidadeName } from "@/domain/movement";
import { todayISO } from "@/shared/lib/format/date";

export type TxSettlement = "paid" | "pending" | "overdue";

export function settlementOf(paymentStatus: string | undefined, date: string, today = todayISO()): TxSettlement {
  if (paymentStatus !== "pending") return "paid";
  return date < today ? "overdue" : "pending";
}

export function dueDateOf(tx: { date: string; movementType?: { name?: string } | null }): string {
  return tx.date?.slice(0, 10) ?? "";
}

/** Data de pagamento/movimentação: só aparece quando o lançamento está conciliado (pago). */
export function paidDateOf(tx: {
  date: string;
  paidAt?: string | null;
  paymentStatus?: string | null;
  movementType?: { name?: string } | null;
}): string {
  if (tx.paymentStatus === "pending") return "";
  if (tx.paidAt) return tx.paidAt.slice(0, 10);
  // Legado pago sem paidAt: não-mensalidade usa o vencimento como data de movimentação.
  if (!isMensalidadeName(tx.movementType?.name)) return tx.date?.slice(0, 10) ?? "";
  return "";
}

/** Pior status do grupo (rateio): vencido > pendente > pago. */
export function groupSettlementOf(
  parts: Array<{ paymentStatus?: string; date: string }>,
  today = todayISO(),
): TxSettlement {
  if (!parts.length) return "pending";
  const statuses = parts.map((part) => settlementOf(part.paymentStatus, part.date, today));
  if (statuses.every((status) => status === "paid")) return "paid";
  if (statuses.some((status) => status === "overdue")) return "overdue";
  return "pending";
}

export function settlementLabel(kind: TxSettlement | "none"): string {
  if (kind === "paid") return "Pago";
  if (kind === "overdue") return "Vencido";
  if (kind === "none") return "—";
  return "Pendente";
}
