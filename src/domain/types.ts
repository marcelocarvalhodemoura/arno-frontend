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
export type ReportGroupBy = "none" | "month" | "branch" | "movementType" | "nature";
export type UserRole = "admin" | "tesoureiro";
export type RecordOrigin = "manual" | "integration" | "sicredi";
export type ImportSource = "csv" | "pdf" | "sicredi";
export type BankProvider = "sicredi";
export type BankMovementStatus = "new" | "matched" | "imported";

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
  /** Valor fixo opcional (ex.: R$ 82 filho de chefe / irmão). Null = tabela oficial. */
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
  /** Diluição de dez/jan/fev — só em maio–novembro. */
  extra: 4.5,
  punctual: 10,
  late: 20,
  clubShare: 20,
  /** Filho de chefe ou irmão(s) no grupo (maio–novembro). */
  specialFamily: 82,
} as const;

/** Valor especial aplicado por filho de chefe ou irmão no grupo. */
export const SPECIAL_FAMILY_FEE = MENSALIDADE_TABLE.specialFamily;

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

export function resolveFeeOverride(profile: { feeOverride?: number | null }): number | null {
  if (profile.feeOverride == null) return null;
  const n = Number(profile.feeOverride);
  if (!Number.isFinite(n) || n < 0) return null;
  return money(n);
}

/** Sem mês → tabela vigente (maio–novembro). */
export function mensalidadeBase(branch: string, month = 5): number {
  if (isEarlyMensalidadeMonth(month)) {
    return branch === "pioneiro" ? MENSALIDADE_TABLE.earlyPioneer : MENSALIDADE_TABLE.earlyRegular;
  }
  return branch === "pioneiro" ? MENSALIDADE_TABLE.basePioneer : MENSALIDADE_TABLE.baseRegular;
}

export function onTimeMonthlyFee(profile: MensalidadeProfile, month = 5): number {
  if (!paysMensalidade(profile)) return 0;
  if (isEarlyMensalidadeMonth(month)) return mensalidadeBase(profile.branch, month);
  const override = resolveFeeOverride(profile);
  if (override != null) return override;
  const base = mensalidadeBase(profile.branch, month);
  if (profile.clubeLtc) return base;
  return money(base + MENSALIDADE_TABLE.punctual + MENSALIDADE_TABLE.extra);
}

export function lateMonthlyFee(profile: MensalidadeProfile, month = 5): number {
  if (!paysMensalidade(profile)) return 0;
  if (isEarlyMensalidadeMonth(month)) return mensalidadeBase(profile.branch, month);
  const override = resolveFeeOverride(profile);
  if (override != null) return override;
  const base = mensalidadeBase(profile.branch, month);
  if (profile.clubeLtc) return base;
  return money(base + MENSALIDADE_TABLE.late + MENSALIDADE_TABLE.extra);
}

export function expectedMonthlyFee(profile: MensalidadeProfile, dueDate: string, today: string): number {
  const month = monthFromDate(dueDate);
  return dueDate < today ? lateMonthlyFee(profile, month) : onTimeMonthlyFee(profile, month);
}

export function clubFeeShare(branch: string, month = 5, profile?: MensalidadeProfile): number {
  if (!isCurrentMensalidadeMonth(month)) return 0;
  if (profile && resolveFeeOverride(profile) != null) return 0;
  return branch === "pioneiro" ? 0 : MENSALIDADE_TABLE.clubShare;
}

export function expectedMensalidadeAmount(
  profile: MensalidadeProfile,
  dueDate: string,
  today: string,
  clubFeeIncluded: boolean,
): number {
  const month = monthFromDate(dueDate);
  const standard = expectedMonthlyFee(profile, dueDate, today);
  const share = clubFeeShare(profile.branch, month, profile);
  if (!share) return standard;
  if (profile.clubeLtc) {
    return clubFeeIncluded ? money(standard + share) : standard;
  }
  return clubFeeIncluded ? standard : money(Math.max(0, standard - share));
}

export function defaultClubFeeIncluded(profile: { clubeLtc?: boolean }): boolean {
  return !profile.clubeLtc;
}

export function isOfficialMensalidadeAmount(profile: MensalidadeProfile, amount: number): boolean {
  const override = resolveFeeOverride(profile);
  if (override != null && amountsNear(amount, override)) return true;
  for (const month of [3, 5] as const) {
    const onTime = onTimeMonthlyFee(profile, month);
    const late = lateMonthlyFee(profile, month);
    if (amountsNear(amount, onTime) || amountsNear(amount, late)) return true;
    const share = clubFeeShare(profile.branch, month, profile);
    if (!share) continue;
    if (profile.clubeLtc) {
      if (amountsNear(amount, money(onTime + share)) || amountsNear(amount, money(late + share))) return true;
      continue;
    }
    if (
      amountsNear(amount, money(Math.max(0, onTime - share))) ||
      amountsNear(amount, money(Math.max(0, late - share)))
    ) {
      return true;
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
