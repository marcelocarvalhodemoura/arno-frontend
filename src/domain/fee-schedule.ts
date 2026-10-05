import type { RecordOrigin } from "./types";

/**
 * Composição da mensalidade por período de vigência — espelho de `fee-table.ts` do backend.
 * A tabela vem da API (`/fee-schedule`, tela "Composição da mensalidade"); até carregar, vale o padrão.
 */

/** Partes da mensalidade (R$). Clube e diluição só entram quando a taxa do clube está incluída (não sócio). */
export interface FeeComposition {
  /** Operacional — caixa do grupo. */
  group: number;
  /** Caixinha do ramo. */
  branch: number;
  /** Lanche. */
  snack: number;
  /** Taxa do clube (Lindóia) até o vencimento. */
  clubOnTime: number;
  /** Taxa do clube (Lindóia) após o vencimento. */
  clubLate: number;
  /** Diluição dez/jan/fev — vai para o caixa do grupo. */
  dilution: number;
  /** Acréscimo por atraso sobre a base — vai para o caixa do grupo. */
  lateFee: number;
  /** Divisão ainda não confirmada pela tesouraria (o total vale; as partes, não). */
  pendingSplit?: boolean;
}

export type FeeProfileKey = "regular" | "pioneer" | "familyNonMember" | "familyMember";

export interface FeeSchedulePeriod {
  id: string;
  startMonth: string;
  endMonth?: string | null;
  note: string;
  regular: FeeComposition;
  pioneer: FeeComposition;
  /** Null = sem valor especial no período: irmãos e filhos de chefe pagam a tabela normal. */
  familyNonMember: FeeComposition | null;
  familyMember: FeeComposition | null;
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type FeeSchedule = FeeSchedulePeriod[];

const ZERO: FeeComposition = { group: 0, branch: 0, snack: 0, clubOnTime: 0, clubLate: 0, dilution: 0, lateFee: 0 };

function composition(parts: Partial<FeeComposition>): FeeComposition {
  return { ...ZERO, ...parts };
}

export const DEFAULT_FEE_SCHEDULE: FeeSchedule = [
  {
    id: "0199b0a0-0000-7000-8000-000000000301",
    startMonth: "2026-03",
    endMonth: "2026-04",
    note: "Tabela anterior à AGE",
    regular: composition({ group: 35, branch: 5, snack: 20 }),
    pioneer: composition({ group: 10, branch: 5, lateFee: 5, pendingSplit: true }),
    familyNonMember: null,
    familyMember: null,
    origin: "manual",
    createdAt: "2026-10-04T00:00:00.000Z",
  },
  {
    id: "0199b0a0-0000-7000-8000-000000000305",
    startMonth: "2026-05",
    endMonth: null,
    note: "Cartaz atual (taxa do clube + diluição dez/jan/fev)",
    regular: composition({ group: 43, branch: 8, snack: 24, clubOnTime: 10, clubLate: 20, dilution: 4.5 }),
    pioneer: composition({ group: 20, branch: 5, clubOnTime: 10, clubLate: 20, dilution: 4.5 }),
    familyNonMember: composition({ group: 74, branch: 8, pendingSplit: true }),
    familyMember: composition({ group: 59.5, branch: 8, pendingSplit: true }),
    origin: "manual",
    createdAt: "2026-10-04T00:00:00.000Z",
  },
];

const LEGACY_FAMILY_FEES = { nonMember: 82, member: 67.5 };

let activeSchedule: FeeSchedule = DEFAULT_FEE_SCHEDULE;

/** Tabela carregada da API (usada como padrão por todas as funções abaixo). */
export function setActiveFeeSchedule(schedule: FeeSchedule) {
  activeSchedule = schedule.length ? schedule : DEFAULT_FEE_SCHEDULE;
}

export function activeFeeSchedule(): FeeSchedule {
  return activeSchedule;
}

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function todayYearMonth(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
}

/** 'YYYY-MM' a partir de uma data ISO ou de 'YYYY-MM'; sem valor = mês atual. */
export function yearMonthOf(when?: string | null): string {
  return when ? when.slice(0, 7) : todayYearMonth();
}

export function periodCovers(period: Pick<FeeSchedulePeriod, "startMonth" | "endMonth">, yearMonth: string): boolean {
  return period.startMonth <= yearMonth && (!period.endMonth || period.endMonth >= yearMonth);
}

/** Período que vale no mês; se mais de um cobre o mês, vence o que começou depois. */
export function periodFor(schedule: FeeSchedule, when?: string | null): FeeSchedulePeriod {
  const ym = yearMonthOf(when);
  const list = schedule.length ? schedule : DEFAULT_FEE_SCHEDULE;
  const byStartDesc = [...list].sort((a, b) => b.startMonth.localeCompare(a.startMonth));
  return (
    byStartDesc.find((period) => periodCovers(period, ym)) ??
    byStartDesc.find((period) => period.startMonth <= ym) ??
    byStartDesc[byStartDesc.length - 1]
  );
}

export function baseOf(parts: FeeComposition): number {
  return money(parts.group + parts.branch + parts.snack);
}

/** Valor fixo do perfil especial de família (sem atraso, sem alternar clube). */
export function familyTotalOf(parts: FeeComposition): number {
  return money(parts.group + parts.branch + parts.snack + parts.clubOnTime + parts.dilution);
}

/** Total no prazo / após o vencimento de um perfil da tabela (não sócio). */
export function compositionTotals(parts: FeeComposition, fixed = false) {
  if (fixed) {
    const total = familyTotalOf(parts);
    return { base: baseOf(parts), onTime: total, late: total };
  }
  const base = baseOf(parts);
  return {
    base,
    onTime: money(base + parts.clubOnTime + parts.dilution),
    late: money(base + parts.lateFee + parts.clubLate + parts.dilution),
  };
}

export function monthFromDate(date: string): number {
  return Number(date.slice(5, 7));
}

export type MensalidadeProfile = {
  branch: string;
  role?: string;
  clubeLtc: boolean;
  feeOverride?: number | null;
};

/** Dirigente, escotista e Clube da Flor de Lis não pagam mensalidade. */
export function paysMensalidade(profile: { role?: string; branch?: string }): boolean {
  if (profile.branch === "flor-de-lis") return false;
  if (profile.role === "escotista" || profile.role === "dirigente" || profile.role === "clube") return false;
  return true;
}

export function amountsNear(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.05;
}

function familyTotals(schedule: FeeSchedule): number[] {
  const totals = [LEGACY_FAMILY_FEES.nonMember, LEGACY_FAMILY_FEES.member];
  for (const period of schedule) {
    if (period.familyNonMember) totals.push(familyTotalOf(period.familyNonMember));
    if (period.familyMember) totals.push(familyTotalOf(period.familyMember));
  }
  return totals;
}

export function isSpecialFamilyFeeAmount(amount: number, schedule: FeeSchedule = activeSchedule): boolean {
  return familyTotals(schedule).some((total) => amountsNear(amount, total));
}

function familyCompositionFor(period: FeeSchedulePeriod, clubeLtc?: boolean): FeeComposition | null {
  return clubeLtc ? period.familyMember : period.familyNonMember;
}

/** Valor especial de família do mês (ou atual); sem valor no período, o último período que tenha. */
export function specialFamilyFee(clubeLtc?: boolean, schedule: FeeSchedule = activeSchedule, when?: string): number {
  const current = familyCompositionFor(periodFor(schedule, when), clubeLtc);
  if (current) return familyTotalOf(current);
  const latest = [...schedule]
    .sort((a, b) => b.startMonth.localeCompare(a.startMonth))
    .map((period) => familyCompositionFor(period, clubeLtc))
    .find((item): item is FeeComposition => item != null);
  if (latest) return familyTotalOf(latest);
  return clubeLtc ? LEGACY_FAMILY_FEES.member : LEGACY_FAMILY_FEES.nonMember;
}

export function resolveFeeOverride(
  profile: { feeOverride?: number | null; clubeLtc?: boolean },
  schedule: FeeSchedule = activeSchedule,
  when?: string,
): number | null {
  if (profile.feeOverride == null) return null;
  const n = Number(profile.feeOverride);
  if (!Number.isFinite(n) || n < 0) return null;
  if (isSpecialFamilyFeeAmount(n, schedule)) return specialFamilyFee(profile.clubeLtc, schedule, when);
  return money(n);
}

type ResolvedFee = { kind: "table"; parts: FeeComposition } | { kind: "fixed"; parts: FeeComposition; total: number };

function resolveFee(profile: MensalidadeProfile, when: string | undefined, schedule: FeeSchedule): ResolvedFee {
  const period = periodFor(schedule, when);
  const table = profile.branch === "pioneiro" ? period.pioneer : period.regular;
  const hasFamily = period.familyNonMember != null || period.familyMember != null;
  if (!hasFamily || profile.feeOverride == null) return { kind: "table", parts: table };
  const override = Number(profile.feeOverride);
  if (!Number.isFinite(override) || override < 0) return { kind: "table", parts: table };

  if (isSpecialFamilyFeeAmount(override, schedule)) {
    const family = familyCompositionFor(period, profile.clubeLtc);
    if (family) return { kind: "fixed", parts: family, total: familyTotalOf(family) };
    return { kind: "table", parts: table };
  }

  const total = money(override);
  const branch = Math.min(table.branch, total);
  return { kind: "fixed", parts: composition({ group: money(total - branch), branch }), total };
}

function mensalidadeTotal(
  profile: MensalidadeProfile,
  dueDate: string,
  opts: { late: boolean; clubFeeIncluded: boolean },
  schedule: FeeSchedule,
): number {
  if (!paysMensalidade(profile)) return 0;
  const resolved = resolveFee(profile, dueDate, schedule);
  if (resolved.kind === "fixed") return resolved.total;
  const parts = resolved.parts;
  const lateFee = opts.late ? parts.lateFee : 0;
  const club = opts.clubFeeIncluded ? (opts.late ? parts.clubLate : parts.clubOnTime) + parts.dilution : 0;
  return money(baseOf(parts) + lateFee + club);
}

/** Valor no prazo. `when` = mês (YYYY-MM ou data); sem valor = mês atual. */
export function onTimeMonthlyFee(profile: MensalidadeProfile, when?: string, schedule: FeeSchedule = activeSchedule) {
  return mensalidadeTotal(
    profile,
    `${yearMonthOf(when)}-01`,
    { late: false, clubFeeIncluded: !profile.clubeLtc },
    schedule,
  );
}

export function lateMonthlyFee(profile: MensalidadeProfile, when?: string, schedule: FeeSchedule = activeSchedule) {
  return mensalidadeTotal(
    profile,
    `${yearMonthOf(when)}-01`,
    { late: true, clubFeeIncluded: !profile.clubeLtc },
    schedule,
  );
}

export function expectedMonthlyFee(profile: MensalidadeProfile, dueDate: string, today: string): number {
  return dueDate < today ? lateMonthlyFee(profile, dueDate) : onTimeMonthlyFee(profile, dueDate);
}

export function expectedMensalidadeAmount(
  profile: MensalidadeProfile,
  dueDate: string,
  today: string,
  clubFeeIncluded: boolean,
  schedule: FeeSchedule = activeSchedule,
): number {
  return mensalidadeTotal(profile, dueDate, { late: dueDate < today, clubFeeIncluded }, schedule);
}

export function defaultClubFeeIncluded(profile: { clubeLtc?: boolean }): boolean {
  return !profile.clubeLtc;
}

export function isOfficialMensalidadeAmount(
  profile: MensalidadeProfile,
  amount: number,
  schedule: FeeSchedule = activeSchedule,
): boolean {
  const override = resolveFeeOverride(profile, schedule);
  if (override != null && amountsNear(amount, override)) return true;
  for (const period of schedule.length ? schedule : DEFAULT_FEE_SCHEDULE) {
    const due = `${period.startMonth}-10`;
    for (const late of [false, true]) {
      for (const clubFeeIncluded of [true, false]) {
        if (amountsNear(amount, mensalidadeTotal(profile, due, { late, clubFeeIncluded }, schedule))) return true;
      }
    }
  }
  return false;
}

export function matchesMensalidadeAmount(
  profile: MensalidadeProfile & { monthlyFee?: number },
  amount: number,
): boolean {
  // Clube da Flor de Lis, escotistas e dirigentes não pagam: nenhum valor é "mensalidade" deles.
  if (!paysMensalidade(profile)) return false;
  if (profile.monthlyFee !== undefined && amountsNear(amount, profile.monthlyFee)) return true;
  return isOfficialMensalidadeAmount(profile, amount);
}

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function shortMonthLabel(yearMonth: string) {
  return `${MONTH_SHORT[Number(yearMonth.slice(5, 7)) - 1] ?? "?"}/${yearMonth.slice(0, 4)}`;
}

/** "A partir de mai/2026", "mar/2026 a abr/2026" ou "nov/2026". */
export function periodRangeLabel(period: Pick<FeeSchedulePeriod, "startMonth" | "endMonth">): string {
  if (!period.endMonth) return `A partir de ${shortMonthLabel(period.startMonth)}`;
  if (period.endMonth === period.startMonth) return shortMonthLabel(period.startMonth);
  return `${shortMonthLabel(period.startMonth)} a ${shortMonthLabel(period.endMonth)}`;
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

function brlPlain(n: number): string {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Em qual categoria da composição a mensalidade do associado cai no mês. */
export function feeCategoryOf(
  profile: MensalidadeProfile,
  when?: string | null,
  schedule: FeeSchedule = activeSchedule,
): FeeCategory {
  const period = periodFor(schedule, when);
  const periodLabel = periodRangeLabel(period);
  const membership = profile.clubeLtc ? "sócio Lindóia" : "não sócio";
  if (!paysMensalidade(profile)) {
    return { key: "exempt", label: "Não paga mensalidade", period, periodLabel, breakdown: "", pendingSplit: false };
  }
  const resolved = resolveFee(profile, when ?? undefined, schedule);
  if (resolved.kind === "fixed") {
    const family = profile.clubeLtc ? period.familyMember : period.familyNonMember;
    if (family && resolved.parts === family) {
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
