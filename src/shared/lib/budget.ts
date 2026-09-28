import type { BudgetStatus } from "@/domain";

/** Status da previsão: estourou, acima do ritmo do ano, ou no caminho. */
export function budgetStatus(planned: number, actual: number, paceMonth?: number | null): BudgetStatus {
  const safePlanned = Number.isFinite(planned) ? planned : 0;
  const safeActual = Number.isFinite(actual) ? actual : 0;
  if (safeActual > safePlanned && (safePlanned > 0 || safeActual > 0)) return "over";
  if (paceMonth && paceMonth >= 1 && paceMonth <= 12 && safePlanned > 0) {
    const expected = safePlanned * (paceMonth / 12);
    if (safeActual > expected) return "watch";
  }
  return "ok";
}

export function budgetStatusLabel(status: BudgetStatus): string {
  if (status === "over") return "Estourou";
  if (status === "watch") return "Atenção";
  return "No caminho";
}

export function budgetPct(planned: number, actual: number): number {
  if (!(planned > 0)) return actual > 0 ? 100 : 0;
  return Math.min(999, Math.round((actual / planned) * 100));
}
