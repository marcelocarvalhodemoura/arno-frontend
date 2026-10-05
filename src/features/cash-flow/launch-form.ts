import {
  defaultClubFeeIncluded,
  expectedMensalidadeAmount,
  matchesMensalidadeAmount,
  paysMensalidade,
  type Member,
  type TxPaymentStatus,
  type TxType,
} from "@/domain";
import { foldName, isMensalidadeName } from "@/domain/movement";
import { brl, MONTHS } from "@/shared/lib/format";

/** Como o formulário trata o tipo escolhido: muda quais campos aparecem e o que é obrigatório. */
export type LaunchKind = "mensalidade" | "agreement" | "other";

export function launchKindOf(typeName?: string | null): LaunchKind {
  if (!typeName) return "other";
  if (isMensalidadeName(typeName)) return "mensalidade";
  const key = foldName(typeName);
  if (key.includes("acordo") || key.includes("divida")) return "agreement";
  return "other";
}

/** Vencimento da mensalidade do mês (AAAA-MM) no dia configurado, limitado ao fim do mês. */
export function competenceDate(yearMonth: string, dueDay = 10): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return "";
  const last = new Date(y, m, 0).getDate();
  const day = Math.min(Math.max(1, Math.trunc(dueDay) || 10), last);
  return `${yearMonth}-${String(day).padStart(2, "0")}`;
}

export function monthYearLabel(date: string): string {
  const month = Number(date.slice(5, 7));
  return month ? `${MONTHS[month - 1]?.toLowerCase()}/${date.slice(0, 4)}` : "";
}

export function autoMensalidadeDescription(date: string, memberName?: string): string {
  const month = Number(date.slice(5, 7));
  const label = `Mensalidade ${MONTHS[month - 1] ?? ""} ${date.slice(0, 4)}`.trim();
  return memberName ? `${label} — ${memberName}` : label;
}

type ExistingTx = {
  id: string;
  date: string;
  amount: number;
  movementTypeId: string;
  memberId?: string | null;
  paymentStatus?: TxPaymentStatus;
};

export type LaunchCheckInput = {
  kind: LaunchKind;
  movementTypeId: string;
  typeChosen: boolean;
  amount: number;
  description: string;
  member?: (Member & { monthlyFee?: number }) | null;
  paymentStatus: TxPaymentStatus;
  date: string;
  paidAt: string;
  today: string;
  editingId?: string | null;
  existing: ExistingTx[];
};

export type LaunchCheck = { errors: string[]; warnings: string[] };

/** Erros impedem salvar; avisos pedem confirmação de quem lança. */
export function checkLaunch(input: LaunchCheckInput): LaunchCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { kind, member } = input;

  if (!input.typeChosen) errors.push("Escolha o que é este lançamento.");
  if (!(input.amount > 0)) errors.push("Informe o valor.");
  if (input.description.trim().length < 2) errors.push("Descreva o lançamento.");
  if (kind !== "other" && !member) {
    errors.push(kind === "mensalidade" ? "Escolha o associado da mensalidade." : "Escolha o associado da dívida.");
  }
  if (!input.date) errors.push(kind === "mensalidade" ? "Escolha o mês que a mensalidade quita." : "Informe a data.");
  if (input.paymentStatus === "paid" && !input.paidAt) errors.push("Informe quando foi pago.");

  if (input.paymentStatus === "paid" && input.paidAt && input.paidAt > input.today) {
    warnings.push("A data de pagamento está no futuro.");
  }

  if (kind === "mensalidade" && member && input.amount > 0 && input.date) {
    if (!paysMensalidade(member)) {
      warnings.push(`${member.name} não paga mensalidade pelo cadastro (papel ou Clube da Flor de Lis).`);
    } else if (!matchesMensalidadeAmount(member, input.amount)) {
      const club = defaultClubFeeIncluded(member);
      const onTime = expectedMensalidadeAmount(member, input.date, input.date, club);
      const late = expectedMensalidadeAmount(member, input.date, nextDay(input.date), club);
      const table = onTime === late ? brl(onTime) : `${brl(onTime)} no prazo ou ${brl(late)} com atraso`;
      warnings.push(`Valor diferente da tabela de ${member.name} (${table}). Se inclui parcela de dívida, confirme.`);
    }
  }

  const duplicate = findDuplicate(input);
  if (duplicate) {
    if (kind === "mensalidade") {
      const status = duplicate.paymentStatus === "pending" ? "pendente" : "paga";
      warnings.push(
        `Já existe mensalidade de ${monthYearLabel(duplicate.date)} para ${member?.name ?? "este associado"} (${status}).` +
          (duplicate.paymentStatus === "pending" ? " Prefira “Marcar como pago” nela para não duplicar." : ""),
      );
    } else {
      warnings.push(`Já existe um lançamento igual em ${duplicate.date.split("-").reverse().join("/")}.`);
    }
  }

  return { errors, warnings };
}

function findDuplicate(input: LaunchCheckInput): ExistingTx | undefined {
  if (!input.typeChosen || !input.date) return undefined;
  const others = input.existing.filter((tx) => tx.id !== input.editingId && tx.movementTypeId === input.movementTypeId);
  if (input.kind === "mensalidade") {
    if (!input.member) return undefined;
    const month = input.date.slice(0, 7);
    return others.find((tx) => tx.memberId === input.member!.id && tx.date.startsWith(month));
  }
  if (!(input.amount > 0)) return undefined;
  return others.find(
    (tx) =>
      tx.date.slice(0, 10) === input.date &&
      Math.abs(tx.amount - input.amount) < 0.005 &&
      (tx.memberId ?? "") === (input.member?.id ?? ""),
  );
}

function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Trechos da frase de resumo; `strong` marca o que a pessoa deve conferir. */
export type SummaryPart = { text: string; strong?: boolean };

export function launchSummary(input: {
  kind: LaunchKind;
  type: TxType;
  typeName?: string;
  amount: number;
  description: string;
  memberName?: string;
  date: string;
  paymentStatus: TxPaymentStatus;
  paidAt: string;
  methodLabel: string;
}): SummaryPart[] {
  const parts: SummaryPart[] = [
    { text: input.type === "income" ? "Entrada de " : "Saída de " },
    { text: input.amount > 0 ? brl(input.amount) : "R$ —", strong: true },
    { text: " · " },
  ];
  if (input.kind === "mensalidade") {
    parts.push({ text: "mensalidade de " }, { text: monthYearLabel(input.date) || "—", strong: true });
    if (input.memberName) parts.push({ text: " de " }, { text: input.memberName, strong: true });
  } else {
    parts.push(
      { text: `${input.typeName ?? "lançamento"}: ` },
      { text: input.description.trim() || "—", strong: true },
    );
    if (input.memberName) parts.push({ text: " · " }, { text: input.memberName, strong: true });
  }
  parts.push({ text: " · " });
  if (input.paymentStatus === "paid") {
    parts.push({ text: "pago em " }, { text: formatBr(input.paidAt) || "—", strong: true });
    parts.push({ text: ` via ${input.methodLabel}` });
  } else {
    parts.push({ text: "pendente, vence em " }, { text: formatBr(input.date) || "—", strong: true });
  }
  parts.push({ text: "." });
  return parts;
}

function formatBr(date: string): string {
  return date ? date.slice(0, 10).split("-").reverse().join("/") : "";
}

/** Valores da tabela para o mês, para mostrar ao lado do campo Valor. */
export function mensalidadeTableHint(member: Member | null | undefined, date: string): string | null {
  if (!member || !date || !paysMensalidade(member)) return null;
  const club = defaultClubFeeIncluded(member);
  const onTime = expectedMensalidadeAmount(member, date, date, club);
  const late = expectedMensalidadeAmount(member, date, nextDay(date), club);
  return onTime === late ? `Tabela: ${brl(onTime)}` : `Tabela: ${brl(onTime)} no prazo · ${brl(late)} com atraso`;
}
