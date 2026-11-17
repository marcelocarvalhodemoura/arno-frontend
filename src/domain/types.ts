export type BranchId = "filhote" | "lobinho" | "escoteiro" | "senior" | "pioneiro" | "flor-de-lis" | "grupo";

export type YouthBranchId = Exclude<BranchId, "grupo">;

export type MemberRole = "jovem" | "escotista" | "dirigente" | "clube";
export type MemberStatus = "active" | "inactive";
export type TxType = "income" | "expense";
export type TxNature = "fixed" | "variable";
/** barter = permuta: só nasce pela tela Permutas, com aprovação da diretoria. */
export type PaymentMethod = "pix" | "cash" | "transfer" | "card" | "other" | "barter";
export type TxPaymentStatus = "paid" | "pending";
export type MovementDirection = "income" | "expense" | "both";
/** Para quem é a atividade: internal = associados (acampamento, bivaque), external = comunidade (festival, pastelada). */
export type MovementAudience = "internal" | "external" | "general";
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
export type ReportGroupBy = "none" | "month" | "branch" | "movementType" | "nature" | "account" | "member" | "method";
/** superadmin: tudo do admin + auditoria e gestão de outros super admins. */
export type UserRole = "superadmin" | "admin" | "tesoureiro";

/** O super admin passa em tudo que o admin passa. */
export function hasRole(role: UserRole | null | undefined, allowed: UserRole[]): boolean {
  if (!role) return false;
  return allowed.includes(role) || role === "superadmin";
}

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}
export const IMPORT_PREVIEW_ROWS = 300;

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: YouthBranchId;
  role: MemberRole;
  monthlyFee: number;
  /** Valor especial (filho de chefe / irmão) ou personalizado; o valor vigente vem da composição. Null = tabela. */
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
  /** Mensalidade: se a taxa do clube (e a diluição) entra neste mês. */
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
  }; /** false: o ano ainda não tem cobranças; a grade só mostra e não gera nada. */
  generated?: boolean;
  /** Quantas cobranças seriam criadas ao gerar o ano. */
  toGenerate?: number;
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

/** Quem pagou um tipo de público interno escolhido no filtro do relatório. */
export interface TypePayers {
  movementTypeId: string;
  name: string;
  payers: { memberId: string; name: string; branch: BranchId; amount: number; count: number; lastDate: string }[];
  total: number;
  unlinked: { amount: number; count: number };
}
