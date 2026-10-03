import type { BranchId, Transaction, TxPaymentStatus, TxType } from "./types";

export type Author = { id: string; name: string; username: string } | null;

export interface TrashItem {
  id: string;
  deletedAt: string;
  deletedBy: Author;
  transaction: Transaction & { movementTypeName: string | null; memberName: string | null };
}

export interface HistoryChange {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
}

export interface HistoryRow {
  id: string;
  at: string;
  kind: "created" | "updated" | "deleted" | "restored";
  by: Author;
  changes: HistoryChange[];
}

export interface MonthClosingRow {
  yearMonth: string;
  closedAt: string;
  closedBy?: string;
  closedByUser: Author;
  income: number;
  expense: number;
  balance: number;
}

export interface DuplicateTx {
  id: string;
  date: string;
  paidAt: string | null;
  description: string;
  amount: number;
  type: TxType;
  origin: string;
  importSource: string | null;
  paymentStatus: TxPaymentStatus;
  movementTypeName: string | null;
  memberName: string | null;
  split: boolean;
  createdAt: string;
}

export interface DuplicateGroup {
  key: string;
  keep: DuplicateTx;
  drop: DuplicateTx[];
}

export interface ReconciliationItem {
  creditId: string;
  date: string;
  amount: number;
  description: string;
  reason: string;
  suggestion: {
    pendingId: string;
    memberId: string;
    memberName: string;
    yearMonth: string;
    label: string;
  } | null;
}

export interface NextSteps {
  overdue: { count: number; amount: number };
  unidentified: { count: number };
  suggestions: { count: number };
  duplicates: { count: number };
  sync: { configured: boolean; lastSyncAt: string | null; days: number | null };
  closing: { yearMonth: string; pending: boolean };
  trash: { count: number };
  nextYear: { year: number; generated: boolean };
}

export interface MemberProfile {
  member: {
    id: string;
    name: string;
    branch: BranchId;
    branchLabel: string;
    role: string;
    status: string;
    joinedAt: string;
    email?: string;
    phone?: string;
  };
  guardians: { id: string; name: string; relationship: string; phone?: string }[];
  openAmount: number;
  open: {
    transactionId: string;
    yearMonth: string;
    year: number;
    month: number;
    dueDate: string;
    status: "pending" | "overdue";
    onTimeAmount: number;
    lateAmount: number;
  }[];
  paidThisYear: number;
  arrears: {
    id: string;
    balance: number;
    installmentAmount: number;
    paidCount: number;
    totalCount: number;
    chargeMode: string;
  }[];
  grade: { year: number; cells: { month: number; status: string }[] } | null;
  recent: {
    id: string;
    date: string;
    paidAt: string | null;
    description: string;
    amount: number;
    type: TxType;
    paymentStatus: TxPaymentStatus;
    movementTypeName: string;
  }[];
}

export interface AssemblyReport {
  from: string;
  to: string;
  groupName: string;
  openingBalance: number;
  closingBalance: number;
  income: number;
  expense: number;
  result: number;
  byBranch: { branch: BranchId; label: string; income: number; expense: number }[];
  byType: { name: string; type: TxType; amount: number }[];
  delinquency: { count: number; members: number; amount: number; rate: number };
}
