import type { BranchId, MemberRole, PaymentMethod, TxNature, TxPaymentStatus, TxType, YouthBranchId } from "@/domain";

export type MapOk<T> = { ok: true; value: T };
export type MapErr = { ok: false; error: string };
export type MapResult<T> = MapOk<T> | MapErr;

export type MemberImportRow = {
  name: string;
  email: string;
  phone: string;
  branch: YouthBranchId;
  role: MemberRole;
  monthlyFee: number;
  joinedAt: string;
  clubeLtc: boolean;
  guardians?: { name: string; relationship: string; phone: string; email: string }[];
};

export type TxImportRow = {
  date: string;
  type: TxType;
  nature: TxNature;
  movementTypeId: string;
  movementTypeName: string;
  description: string;
  amount: number;
  branch: BranchId;
  method: PaymentMethod;
  paymentStatus: TxPaymentStatus;
  memberId?: string;
  memberName?: string;
  memberGuardianId?: string;
  memberGuardianName?: string;
};
