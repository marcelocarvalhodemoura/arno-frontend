export type BranchId = "filhote" | "lobinho" | "escoteiro" | "senior" | "pioneiro" | "flor-de-lis" | "grupo";

export type YouthBranchId = Exclude<BranchId, "grupo">;

export type MemberRole = "jovem" | "escotista" | "dirigente" | "clube";
export type MemberStatus = "active" | "inactive";
export type TxType = "income" | "expense";
export type TxNature = "fixed" | "variable";
export type PaymentMethod = "pix" | "cash" | "transfer" | "card" | "other";
export type TxPaymentStatus = "paid" | "pending";
export type MovementDirection = "income" | "expense" | "both";
export type AccountHolderKind = "parent" | "youth" | "other";
export type GuardianRelationship =
  | "Mãe"
  | "Pai"
  | "Madrasta"
  | "Padrasto"
  | "Tia"
  | "Tio"
  | "Avó"
  | "Avô"
  | "Irmã"
  | "Irmão"
  | "Responsável legal"
  | "Outro";
export type ReportGroupBy = "none" | "month" | "branch" | "movementType" | "nature" | "account";
export type UserRole = "admin" | "tesoureiro";
export type RecordOrigin = "manual" | "integration" | "sicredi";
export type ImportSource = "csv" | "pdf" | "sicredi";
export type BankProvider = "sicredi";
export type BankMovementStatus = "new" | "matched" | "imported";
export type ArrearsChargeMode = "embed" | "separate";
export type ArrearsStatus = "active" | "settled" | "cancelled";
export type ArrearsPaymentSource = "manual" | "mensalidade" | "separate";

/** Registro de pagamento aplicado ao saldo do acordo. */
export interface ArrearsPayment {
  id: string;
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  source: ArrearsPaymentSource;
  transactionId?: string;
  yearMonth?: string;
  note?: string;
  createdAt: string;
  createdBy?: string;
}

/** Linhas por requisição de importação. O front fatia arquivos maiores. */
export const IMPORT_CHUNK_SIZE = 200;
/** Teto do arquivo inteiro (associados ou extrato). */
export const IMPORT_MAX_ROWS = 10_000;
/** Quantas linhas a prévia desenha na tabela. */
export const IMPORT_PREVIEW_ROWS = 300;

export function chunkList<T>(items: T[], size = IMPORT_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  const step = size > 0 ? size : IMPORT_CHUNK_SIZE;
  for (let index = 0; index < items.length; index += step) {
    chunks.push(items.slice(index, index + step));
  }
  return chunks;
}

export interface AuditInfo {
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DASHBOARD_BRANCHES: BranchId[] = [
  "filhote",
  "lobinho",
  "escoteiro",
  "senior",
  "pioneiro",
  "flor-de-lis",
  "grupo",
];

export interface AppUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  origin: RecordOrigin;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface BranchMeta {
  id: YouthBranchId;
  name: string;
  unit: string;
  color: string;
  tone: string;
}

export const YOUTH_BRANCHES: BranchMeta[] = [
  {
    id: "filhote",
    name: "Ramo Filhotes",
    unit: "Filhotes",
    color: "#ee9b00",
    tone: "amber",
  },
  {
    id: "lobinho",
    name: "Ramo Lobinho",
    unit: "Alcateia",
    color: "#e8b423",
    tone: "gold",
  },
  {
    id: "escoteiro",
    name: "Ramo Escoteiro",
    unit: "Tropa Escoteira",
    color: "#2d8a4e",
    tone: "pine",
  },
  {
    id: "senior",
    name: "Ramo Sênior",
    unit: "Tropa Sênior",
    color: "#8b1a2b",
    tone: "wine",
  },
  {
    id: "pioneiro",
    name: "Ramo Pioneiro",
    unit: "Clã Pioneiro",
    color: "#c8102e",
    tone: "clay",
  },
  {
    id: "flor-de-lis",
    name: "Clube da Flor de Lis",
    unit: "Flor de Lis",
    color: "#0c2d6b",
    tone: "navy",
  },
];

export const BRANCH_LABELS: Record<BranchId, string> = {
  filhote: "Filhotes",
  lobinho: "Lobinho",
  escoteiro: "Escoteiro",
  senior: "Sênior",
  pioneiro: "Pioneiro",
  "flor-de-lis": "Flor de Lis",
  grupo: "Grupo",
};

export const ALL_BRANCHES: BranchId[] = [
  "filhote",
  "lobinho",
  "escoteiro",
  "senior",
  "pioneiro",
  "flor-de-lis",
  "grupo",
];

export const GUARDIAN_RELATIONSHIPS: GuardianRelationship[] = [
  "Mãe",
  "Pai",
  "Madrasta",
  "Padrasto",
  "Tia",
  "Tio",
  "Avó",
  "Avô",
  "Irmã",
  "Irmão",
  "Responsável legal",
  "Outro",
];

export interface MovementType {
  id: string;
  name: string;
  direction: MovementDirection;
  description: string;
  pixKey: string;
  branch: BranchId;
  active: boolean;
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Fee {
  id: string;
  name: string;
  amount: number;
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: YouthBranchId;
  role: MemberRole;
  monthlyFee: number;
  /** Valor fixo opcional (ex.: R$ 82 / R$ 67,50 filho de chefe ou irmão). Null = tabela oficial. */
  feeOverride?: number | null;
  /** Filho de chefe — XOR com irmãos; aplica feeOverride especial. */
  chiefChild?: boolean;
  /** IDs de irmãos associados (vindo da API). */
  siblingIds?: string[];
  status: MemberStatus;
  joinedAt: string;
  clubeLtc: boolean;
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MemberGuardian {
  id: string;
  memberId: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MemberAccount {
  id: string;
  memberId: string;
  holderName: string;
  holderKind: AccountHolderKind;
  relationship: string;
  pixKey: string;
  bank: string;
  agency: string;
  accountNumber: string;
  document: string;
  notes?: string;
  isPrimary: boolean;
  active: boolean;
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MemberArrears {
  id: string;
  memberId: string;
  originalAmount: number;
  balance: number;
  installmentAmount: number;
  totalCount: number;
  remainingCount: number;
  startYearMonth: string;
  chargeMode: ArrearsChargeMode;
  note: string;
  status: ArrearsStatus;
  /** Histórico de baixas (manual, mensalidade embutida ou lançamento à parte). */
  payments?: ArrearsPayment[];
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TxType;
  nature: TxNature;
  movementTypeId: string;
  description: string;
  amount: number;
  branch: BranchId;
  method: PaymentMethod;
  paymentStatus: TxPaymentStatus;
  paidAt?: string;
  memberId?: string;
  memberAccountId?: string;
  memberGuardianId?: string;
  projectId?: string;
  notes?: string;
  /** Chave do arquivo da nota no S3. */
  notaKey?: string;
  notaFileName?: string;
  notaContentType?: string;
  externalId?: string;
  /** Mensalidade: se a parcela do clube (R$ 20) entra neste mês. */
  clubFeeIncluded?: boolean;
  /** Rateio: id comum a todas as partes do mesmo crédito. */
  splitGroupId?: string;
  /** Rateio: valor original do lançamento antes de partir. */
  splitTotal?: number;
  /** Rateio: índice 1-based desta parte. */
  splitIndex?: number;
  /** Rateio: quantidade de partes. */
  splitCount?: number;
  /** Acordo de dívida (modo separate). */
  arrearsId?: string;
  /** Competência YYYY-MM da parcela do acordo. */
  arrearsYearMonth?: string;
  /** csv | pdf | sicredi — preenchido nas importações novas. */
  importSource?: ImportSource;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  origin: RecordOrigin;
}

export interface BankMovement {
  id: string;
  provider: BankProvider;
  externalId: string;
  occurredAt: string;
  date: string;
  amount: number;
  type: TxType;
  method: PaymentMethod;
  description: string;
  payerName: string;
  payerDocument: string;
  txid: string;
  status: BankMovementStatus;
  transactionId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectItem {
  id: string;
  category: string;
  description: string;
  planned: number;
  movementTypeId?: string;
}

export interface FinancialProject {
  id: string;
  branch: BranchId;
  year: number;
  name: string;
  description: string;
  items: ProjectItem[];
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Settings {
  openingBalance: number;
  groupName: string;
  mensalidadeDueDay?: number;
}

export type MensalidadeCellStatus = "paid" | "pending" | "overdue" | "none";

export interface MensalidadeCell {
  month: number;
  dueDate: string | null;
  status: MensalidadeCellStatus;
  transactionId?: string;
  amount: number;
  /** Valor se pago até o dia de vencimento. */
  onTimeAmount: number;
  /** Valor se pago após o dia de vencimento. */
  lateAmount: number;
  /** Se a parcela do clube está incluída neste mês. */
  clubFeeIncluded: boolean;
  /** Parcela de dívida embutida (modo embed), se houver. */
  arrearsInstallment?: number;
  arrearsPlanId?: string;
}

export interface MensalidadeRow {
  memberId: string;
  name: string;
  branch: YouthBranchId;
  role: MemberRole;
  memberStatus: MemberStatus;
  joinedAt: string;
  dueDay: number;
  monthlyFee: number;
  lateFee: number;
  clubeLtc: boolean;
  feeOverride?: number | null;
  chiefChild?: boolean;
  /** Irmãos no grupo (para baixar mensalidades juntas). */
  siblingIds?: string[];
  cells: MensalidadeCell[];
}

export interface MensalidadeReport {
  year: number;
  dueDay: number;
  months: number[];
  rows: MensalidadeRow[];
  summary: {
    paid: number;
    pending: number;
    overdue: number;
    openAmount: number;
    paidAmount: number;
  };
}

export interface DatabaseShape {
  members: Member[];
  memberGuardians: MemberGuardian[];
  memberAccounts: MemberAccount[];
  movementTypes: MovementType[];
  fees: Fee[];
  transactions: Transaction[];
  projects: FinancialProject[];
  settings: Settings;
}

export interface CashFlowMonth {
  month: string;
  income: number;
  expense: number;
  net: number;
  balance: number;
  byMovementType: { movementTypeId: string; name: string; income: number; expense: number }[];
  byBranch: { branch: BranchId; income: number; expense: number }[];
}

export interface CustomReportQuery {
  from: string;
  to: string;
  branches: BranchId[];
  types: TxType[];
  natures: TxNature[];
  movementTypeIds: string[];
  groupBy: ReportGroupBy;
}

export interface CustomReportRow {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  count: number;
}

export interface FiscalLedgerLine {
  seq: number;
  id: string;
  date: string;
  type: TxType;
  nature: TxNature;
  movementType: string;
  branch: BranchId;
  memberName?: string;
  guardianName?: string;
  accountHolder?: string;
  description: string;
  income: number;
  expense: number;
  balance: number;
  createdByName: string;
  createdAt: string;
  updatedByName?: string;
  updatedAt?: string;
  origin: RecordOrigin;
  importSource?: ImportSource;
}

export type BudgetStatus = "ok" | "watch" | "over";

export interface BudgetSlice {
  planned: number;
  actual: number;
  remaining: number;
  status: BudgetStatus;
}

export interface DashboardBudget {
  plannedExpense: number;
  actualExpense: number;
  remaining: number;
  pctUsed: number;
  byBranch: (BudgetSlice & { branch: BranchId })[];
  byMovementType: (BudgetSlice & { movementTypeId: string; name: string })[];
}

export interface DashboardPayload {
  year: number;
  month: number;
  from: string;
  to: string;
  opening: number;
  income: number;
  expense: number;
  current: number;
  members: number;
  activeMembers: number;
  byBranch: {
    branch: BranchId;
    income: number;
    expense: number;
    members: number;
  }[];
  chart: { month: string; income: number; expense: number; balance: number }[];
  /** Previsão anual do grupo (independente do filtro de mês do painel). */
  budget: DashboardBudget;
}

/** Padrão do cartaz; o valor vigente fica em Configurações (`mensalidadeDueDay`). */
export const DEFAULT_MENSALIDADE_DUE_DAY = 10;

export function resolveMensalidadeDueDay(value?: number | null): number {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 31) return DEFAULT_MENSALIDADE_DUE_DAY;
  return day;
}

export const MENSALIDADE_TABLE = {
  earlyRegular: 60,
  earlyPioneer: 15,
  baseRegular: 75,
  basePioneer: 25,
  /** Diluição de dez/jan/fev — só em maio–novembro (taxa do clube cobre 12 meses). */
  extra: 4.5,
  /** Taxa Lindóia com pagamento até o dia 10. */
  punctual: 10,
  /** Taxa Lindóia após o dia 10. */
  late: 20,
  /**
   * Composição da mensalidade do grupo (R$ 75):
   * R$ 43 operacionais + R$ 8 caixinhas dos ramos + R$ 24 lanche.
   */
  branchShare: 8,
  operationalShare: 43,
  snackShare: 24,
  /** Filho de chefe / irmão(s) — não sócio (maio–novembro). */
  specialFamily: 82,
  /** Filho de chefe / irmão(s) — sócio Lindóia (maio–novembro). */
  specialFamilyMember: 67.5,
} as const;

/** Parcela da mensalidade destinada à caixinha do ramo. */
export const MENSALIDADE_BRANCH_SHARE = MENSALIDADE_TABLE.branchShare;

/** Valor especial — filho de chefe / irmão não sócio. */
export const SPECIAL_FAMILY_FEE = MENSALIDADE_TABLE.specialFamily;

/** Valor especial — filho de chefe / irmão sócio Lindóia. */
export const SPECIAL_FAMILY_FEE_MEMBER = MENSALIDADE_TABLE.specialFamilyMember;

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

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

export function amountsNear(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.05;
}

export function isEarlyMensalidadeMonth(month: number): boolean {
  return month === 3 || month === 4;
}

export function isCurrentMensalidadeMonth(month: number): boolean {
  return month >= 5 && month <= 11;
}

export function monthFromDate(date: string): number {
  return Number(date.slice(5, 7));
}

export function specialFamilyFee(clubeLtc?: boolean): number {
  return clubeLtc ? SPECIAL_FAMILY_FEE_MEMBER : SPECIAL_FAMILY_FEE;
}

export function isSpecialFamilyFeeAmount(amount: number): boolean {
  return amountsNear(amount, SPECIAL_FAMILY_FEE) || amountsNear(amount, SPECIAL_FAMILY_FEE_MEMBER);
}

export function resolveFeeOverride(profile: { feeOverride?: number | null; clubeLtc?: boolean }): number | null {
  if (profile.feeOverride == null) return null;
  const n = Number(profile.feeOverride);
  if (!Number.isFinite(n) || n < 0) return null;
  if (isSpecialFamilyFeeAmount(n)) return specialFamilyFee(profile.clubeLtc);
  return money(n);
}

/** Sem mês → tabela vigente (maio–novembro). */
export function mensalidadeBase(branch: string, month = 5): number {
  if (isEarlyMensalidadeMonth(month)) {
    return branch === "pioneiro" ? MENSALIDADE_TABLE.earlyPioneer : MENSALIDADE_TABLE.earlyRegular;
  }
  return branch === "pioneiro" ? MENSALIDADE_TABLE.basePioneer : MENSALIDADE_TABLE.baseRegular;
}

export function clubFeeAddon(month: number, late: boolean): number {
  if (!isCurrentMensalidadeMonth(month)) return 0;
  const club = late ? MENSALIDADE_TABLE.late : MENSALIDADE_TABLE.punctual;
  return money(club + MENSALIDADE_TABLE.extra);
}

export function onTimeMonthlyFee(profile: MensalidadeProfile, month = 5): number {
  if (!paysMensalidade(profile)) return 0;
  if (isEarlyMensalidadeMonth(month)) return mensalidadeBase(profile.branch, month);
  const override = resolveFeeOverride(profile);
  if (override != null) return override;
  const base = mensalidadeBase(profile.branch, month);
  if (profile.clubeLtc) return base;
  return money(base + clubFeeAddon(month, false));
}

export function lateMonthlyFee(profile: MensalidadeProfile, month = 5): number {
  if (!paysMensalidade(profile)) return 0;
  if (isEarlyMensalidadeMonth(month)) return mensalidadeBase(profile.branch, month);
  const override = resolveFeeOverride(profile);
  if (override != null) return override;
  const base = mensalidadeBase(profile.branch, month);
  if (profile.clubeLtc) return base;
  return money(base + clubFeeAddon(month, true));
}

export function expectedMonthlyFee(profile: MensalidadeProfile, dueDate: string, today: string): number {
  const month = monthFromDate(dueDate);
  return dueDate < today ? lateMonthlyFee(profile, month) : onTimeMonthlyFee(profile, month);
}

export function clubFeeShare(branch: string, month = 5, profile?: MensalidadeProfile): number {
  if (!isCurrentMensalidadeMonth(month)) return 0;
  if (profile && resolveFeeOverride(profile) != null) return 0;
  void branch;
  return clubFeeAddon(month, false);
}

export function expectedMensalidadeAmount(
  profile: MensalidadeProfile,
  dueDate: string,
  today: string,
  clubFeeIncluded: boolean,
): number {
  if (!paysMensalidade(profile)) return 0;
  const month = monthFromDate(dueDate);
  if (isEarlyMensalidadeMonth(month)) return mensalidadeBase(profile.branch, month);

  const override = resolveFeeOverride(profile);
  if (override != null) return override;

  const base = mensalidadeBase(profile.branch, month);
  if (!clubFeeIncluded) return base;

  const late = dueDate < today;
  return money(base + clubFeeAddon(month, late));
}

export function defaultClubFeeIncluded(profile: { clubeLtc?: boolean }): boolean {
  return !profile.clubeLtc;
}

export function isOfficialMensalidadeAmount(profile: MensalidadeProfile, amount: number): boolean {
  const override = resolveFeeOverride(profile);
  if (override != null && amountsNear(amount, override)) return true;
  for (const month of [3, 5] as const) {
    const due = `2026-${String(month).padStart(2, "0")}-10`;
    const onTimeToday = due;
    const lateToday = `2026-${String(month).padStart(2, "0")}-11`;
    for (const club of [true, false]) {
      if (amountsNear(amount, expectedMensalidadeAmount(profile, due, onTimeToday, club))) return true;
      if (amountsNear(amount, expectedMensalidadeAmount(profile, due, lateToday, club))) return true;
    }
  }
  return false;
}

export function matchesMensalidadeAmount(
  profile: MensalidadeProfile & { monthlyFee?: number },
  amount: number,
): boolean {
  if (profile.monthlyFee !== undefined && amountsNear(amount, profile.monthlyFee)) return true;
  return isOfficialMensalidadeAmount(profile, amount);
}
