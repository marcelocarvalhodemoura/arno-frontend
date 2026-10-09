import * as rules from "@/contract/fee-rules";
import type { FeeComposition, FeeProfileKey, FeeSchedulePeriod } from "@/contract/types";
import type { FeeSchedule, MensalidadeProfile } from "@/contract/fee-rules";

/**
 * Composição da mensalidade por período de vigência. As regras vêm do contrato compartilhado com o backend
 * (src/contract, gerado por `npm run sync:contract`); aqui ficam só o que é da tela: a tabela carregada da API
 * como padrão das funções e a categoria exibida na interface.
 */

export {
  amountsNear,
  baseOf,
  compositionTotals,
  defaultClubFeeIncluded,
  DEFAULT_FEE_SCHEDULE,
  familyTotalOf,
  monthFromDate,
  paysMensalidade,
  periodCovers,
  periodFor,
  periodRangeLabel,
  yearMonthOf,
} from "@/contract/fee-rules";
export type { FeeSchedule, MensalidadeProfile } from "@/contract/fee-rules";

let activeSchedule: FeeSchedule = rules.DEFAULT_FEE_SCHEDULE;

/** Tabela carregada da API (usada como padrão por todas as funções abaixo). */
export function setActiveFeeSchedule(schedule: FeeSchedule) {
  activeSchedule = schedule.length ? schedule : rules.DEFAULT_FEE_SCHEDULE;
}

export function activeFeeSchedule(): FeeSchedule {
  return activeSchedule;
}

export function isSpecialFamilyFeeAmount(amount: number, schedule: FeeSchedule = activeSchedule): boolean {
  return rules.isSpecialFamilyFeeAmount(amount, schedule);
}

export function specialFamilyFee(clubeLtc?: boolean, schedule: FeeSchedule = activeSchedule, when?: string): number {
  return rules.specialFamilyFee(clubeLtc, schedule, when);
}

export function resolveFeeOverride(
  profile: { feeOverride?: number | null; clubeLtc?: boolean },
  schedule: FeeSchedule = activeSchedule,
  when?: string,
): number | null {
  return rules.resolveFeeOverride(profile, schedule, when);
}

/** Valor no prazo. `when` = mês (YYYY-MM ou data); sem valor = mês atual. */
export function onTimeMonthlyFee(profile: MensalidadeProfile, when?: string, schedule: FeeSchedule = activeSchedule) {
  return rules.onTimeMonthlyFee(profile, when, schedule);
}

export function lateMonthlyFee(profile: MensalidadeProfile, when?: string, schedule: FeeSchedule = activeSchedule) {
  return rules.lateMonthlyFee(profile, when, schedule);
}

export function expectedMonthlyFee(profile: MensalidadeProfile, dueDate: string, today: string): number {
  return rules.expectedMonthlyFee(profile, dueDate, today, activeSchedule);
}

export function expectedMensalidadeAmount(
  profile: MensalidadeProfile,
  dueDate: string,
  today: string,
  clubFeeIncluded: boolean,
  schedule: FeeSchedule = activeSchedule,
): number {
  return rules.expectedMensalidadeAmount(profile, dueDate, today, clubFeeIncluded, schedule);
}

export function isOfficialMensalidadeAmount(
  profile: MensalidadeProfile,
  amount: number,
  schedule: FeeSchedule = activeSchedule,
): boolean {
  return rules.isOfficialMensalidadeAmount(profile, amount, schedule);
}

export function matchesMensalidadeAmount(profile: MensalidadeProfile, amount: number): boolean {
  return rules.matchesMensalidadeAmount(profile, amount, activeSchedule);
}

export type FeeCategory = {
  /** Perfil da composição; "custom" = valor personalizado no cadastro; "exempt" = não paga. */
  key: FeeProfileKey | "custom" | "exempt";
  /** Ex.: "Demais ramos · não sócio". */
  label: string;
  /** Período da composição que vale no mês. */
  period: FeeSchedulePeriod;
  periodLabel: string;
  /** Partes em texto, para dica (title). */
  breakdown: string;
  pendingSplit: boolean;
};

function brlPlain(n: number): string {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function breakdownOf(parts: FeeComposition, fixed: boolean, clubIncluded: boolean): string {
  const items = [
    `Grupo ${brlPlain(parts.group)}`,
    `Caixinha ${brlPlain(parts.branch)}`,
    `Lanche ${brlPlain(parts.snack)}`,
  ];
  if (clubIncluded && (parts.clubOnTime || parts.clubLate)) {
    items.push(
      fixed
        ? `Clube ${brlPlain(parts.clubOnTime)}`
        : `Clube ${brlPlain(parts.clubOnTime)} / ${brlPlain(parts.clubLate)}`,
    );
  }
  if (clubIncluded && parts.dilution) items.push(`Diluição ${brlPlain(parts.dilution)}`);
  if (!fixed && parts.lateFee) items.push(`Atraso +${brlPlain(parts.lateFee)}`);
  return items.join(" · ");
}

/** Em qual categoria da composição a mensalidade do associado cai no mês. */
export function feeCategoryOf(
  profile: MensalidadeProfile,
  when?: string | null,
  schedule: FeeSchedule = activeSchedule,
): FeeCategory {
  const period = rules.periodFor(schedule, when);
  const periodLabel = rules.periodRangeLabel(period);
  const membership = profile.clubeLtc ? "sócio Lindóia" : "não sócio";
  if (!rules.paysMensalidade(profile)) {
    return { key: "exempt", label: "Não paga mensalidade", period, periodLabel, breakdown: "", pendingSplit: false };
  }
  const resolved = rules.resolveFee(profile, when ?? undefined, schedule);
  if (resolved.kind === "fixed") {
    const family = profile.clubeLtc ? period.familyMember : period.familyNonMember;
    if (resolved.special === "family" && family) {
      return {
        key: profile.clubeLtc ? "familyMember" : "familyNonMember",
        label: `Irmãos / filho de chefe · ${membership}`,
        period,
        periodLabel,
        breakdown: breakdownOf(family, true, true),
        pendingSplit: Boolean(family.pendingSplit),
      };
    }
    return {
      key: "custom",
      label: "Valor personalizado",
      period,
      periodLabel,
      breakdown: breakdownOf(resolved.parts, true, false),
      pendingSplit: false,
    };
  }
  const pioneer = profile.branch === "pioneiro";
  return {
    key: pioneer ? "pioneer" : "regular",
    label: `${pioneer ? "Pioneiro" : "Demais ramos"} · ${membership}`,
    period,
    periodLabel,
    breakdown: breakdownOf(resolved.parts, false, !profile.clubeLtc),
    pendingSplit: Boolean(resolved.parts.pendingSplit),
  };
}
