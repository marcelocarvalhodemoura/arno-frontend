import { isMensalidadeName } from "@/domain/movement";
import { todayISO } from "@/shared/lib/format/date";

export type TxSettlement = "paid" | "pending" | "overdue";

export function settlementOf(paymentStatus: string | undefined, date: string, today = todayISO()): TxSettlement {
  if (paymentStatus !== "pending") return "paid";
  return date < today ? "overdue" : "pending";
}

export function dueDateOf(tx: { date: string; movementType?: { name?: string } | null }): string {
  return isMensalidadeName(tx.movementType?.name) ? tx.date : "";
}

export function paidDateOf(tx: {
  date: string;
  paidAt?: string | null;
  movementType?: { name?: string } | null;
}): string {
  if (tx.paidAt) return tx.paidAt;
  if (!isMensalidadeName(tx.movementType?.name)) return tx.date;
  return "";
}

export function settlementLabel(kind: TxSettlement): string {
  if (kind === "paid") return "Pago";
  if (kind === "overdue") return "Vencido";
  return "Pendente";
}
