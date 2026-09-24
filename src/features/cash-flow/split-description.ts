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

export type SplitPeerSummary = {
  id: string;
  amount: number;
  splitIndex?: number;
  memberName?: string | null;
  description: string;
};

/** Texto curto listando para quem foi cada parte do rateio. */
export function formatSplitBeneficiaries(peers: SplitPeerSummary[]): string {
  if (!peers.length) return "";
  const sorted = [...peers].sort((a, b) => (a.splitIndex ?? 0) - (b.splitIndex ?? 0));
  return sorted
    .map((peer) => {
      const who = peer.memberName?.trim() || "sem associado";
      return `${who} (${formatBrl(peer.amount)})`;
    })
    .join(" · ");
}

function formatBrl(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
