import type {
  BranchId,
  Fee,
  FinancialProject,
  ImportSource,
  MemberAccount,
  MemberGuardian,
  MemberRole,
  MemberStatus,
  MensalidadeRow,
  MovementType,
  PaymentMethod,
  RecordOrigin,
  Settings,
  TxNature,
  TxPaymentStatus,
  TxType,
  UserRole,
  YouthBranchId,
} from "@/contract/types";

/** Tipos e constantes compartilhados com o backend: cópia gerada em src/contract (npm run sync:contract). */
export * from "@/contract/types";

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
