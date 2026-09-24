/** Descrição automática de uma parte do rateio. */
export function buildSplitPartDescription(input: {
  baseDescription: string;
  partIndex: number;
  partCount: number;
  partAmount: number;
  totalAmount: number;
  memberName?: string;
}): string {
  const base = input.baseDescription.trim() || "Lançamento";
  const partLabel = `parte ${input.partIndex}/${input.partCount}`;
  const moneyLabel = `${formatBrl(input.partAmount)} de ${formatBrl(input.totalAmount)}`;
  if (input.memberName?.trim()) {
    return `${input.memberName.trim()} · ${partLabel} · ${moneyLabel} · ${base}`;
  }
  return `${base} · ${partLabel} · ${moneyLabel}`;
}

function formatBrl(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
