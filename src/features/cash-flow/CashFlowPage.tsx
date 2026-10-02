import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ALL_BRANCHES,
  BRANCH_LABELS,
  YOUTH_BRANCHES,
  type BranchId,
  type FinancialProject,
  type Member,
  type MemberAccount,
  type MemberGuardian,
  type MovementType,
  type PaymentMethod,
  type Transaction,
  type TxNature,
  type TxPaymentStatus,
  type TxType,
  matchesMensalidadeAmount,
} from "@/domain";
import PageHeader from "@/shared/ui/PageHeader";
import Modal from "@/shared/ui/Modal";
import { PageGuide, cashFlowGuide } from "@/features/help";
import StatCard, { Badge } from "@/shared/ui/StatCard";
import RecordStamp from "@/shared/ui/RecordStamp";
import PageLoader from "@/shared/ui/PageLoader";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import ListingResults from "@/shared/ui/ListingResults";
import SubmitButton from "@/shared/ui/SubmitButton";
import FilterBar from "@/shared/ui/FilterBar";
import { PeriodField } from "@/shared/ui/PeriodControl";
import SearchableSelect from "@/shared/ui/SearchableSelect";
import Pager from "@/shared/ui/Pager";
import IconButton from "@/shared/ui/IconButton";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  FaCheck,
  FaChevronDown,
  FaClock,
  FaExpand,
  FaFileAlt,
  FaHandHoldingUsd,
  FaLink,
  FaPaperclip,
  FaPen,
  FaTag,
  FaTrashAlt,
  FaCodeBranch,
  FaCalendarAlt,
} from "react-icons/fa";
import { useToast } from "@/shared/feedback/toast";
import { api } from "@/core/http";
import NotaViewer from "@/features/cash-flow/NotaViewer";
import NotaUploadModal from "@/features/cash-flow/NotaUploadModal";
import AllocateMensalidadesModal from "@/features/cash-flow/AllocateMensalidadesModal";
import {
  brl,
  formatDate,
  methodLabel,
  MONTHS,
  natureLabel,
  originLabel,
  dueDateOf,
  paidDateOf,
  settlementLabel,
  settlementOf,
  groupSettlementOf,
  signedClass,
  todayISO,
  typeLabel,
} from "@/shared/lib/format";
import { formatMoney, maskMoney, parseMoney } from "@/shared/lib/masks";
import { formClass, submitAttempt } from "@/shared/lib/form";
import { matchesQuery, usePagedList } from "@/shared/lib/listing";
import { duration, ease } from "@/shared/lib/motion";
import { dateInPeriod, periodRange, usePeriod } from "@/shared/lib/period";
import { useFetch } from "@/shared/hooks/use-fetch";
import { isMensalidadeName, isUnidentifiedName, natureForTypeName } from "@/domain/movement";
import { clearIdentifyFlag, readIdentifyFlag } from "@/core/session/identify-flag";
import { buildSplitPartDescription } from "@/features/cash-flow/split-description";
import { buildCashFlowDisplayRows, splitGroupLabel, uniqueSplitBranches } from "@/features/cash-flow/split-display";
import { sortCashFlowDisplayRows, type CashFlowSortKey } from "@/features/cash-flow/sort-display";
import SortableTh, { nextSortDir, type SortDir } from "@/shared/ui/SortableTh";

type Flow = {
  opening: number;
  closing: number;
  months: { month: string; income: number; expense: number; net: number; balance: number }[];
};

type StampUser = { id: string; name: string; username: string } | null;

type MemberOption = Member & { accounts: MemberAccount[]; guardians?: MemberGuardian[] };

type TxView = Transaction & {
  movementType: MovementType | null;
  member: Member | null;
  account: MemberAccount | null;
  guardian: MemberGuardian | null;
  createdByUser: StampUser;
  updatedByUser: StampUser;
  hasNota?: boolean;
  /** Mensalidade com parcela de acordo embutida, ou lançamento só de acordo. */
  arrearsMarker?: "embed" | "agreement" | null;
};

type OpenMensalidade = {
  transactionId: string;
  yearMonth: string;
  year: number;
  month: number;
  dueDate: string;
  status: "pending" | "overdue";
  onTimeAmount: number;
  lateAmount: number;
};

type SplitPartDraft = {
  amount: string;
  movementTypeId: string;
  description: string;
  memberId: string;
  /** Competência AAAA-MM que a parte quita — obrigatória quando o tipo é Mensalidade. */
  competence: string;
  /** Se false, o usuário editou a descrição e não regeneramos automaticamente. */
  autoDescription: boolean;
};

function blankForm(year: number, month: number) {
  return {
    date: dateInPeriod(year, month),
    paidAt: dateInPeriod(year, month),
    type: "income" as TxType,
    nature: "variable" as TxNature,
    movementTypeId: "",
    description: "",
    amount: "",
    branch: "grupo" as BranchId,
    method: "pix" as PaymentMethod,
    paymentStatus: "paid" as TxPaymentStatus,
    memberId: "",
    memberAccountId: "",
    memberGuardianId: "",
    projectId: "",
  };
}

export default function CashFlow() {
  const toast = useToast();
  const { year, month, setYear, setMonth } = usePeriod();
  const { from, to } = periodRange(year, month);
  const flow = useFetch<Flow>(`/reports/cashflow?from=${from}&to=${to}`);
  const txs = useFetch<TxView[]>(`/transactions?from=${from}&to=${to}`);
  const yearTxs = useFetch<TxView[]>(month ? `/transactions?from=${year}-01-01&to=${year}-12-31` : null);
  const types = useFetch<MovementType[]>("/movement-types");
  const members = useFetch<MemberOption[]>("/members");
  const projects = useFetch<FinancialProject[]>(`/projects?year=${year || 2026}`);
  const [open, setOpen] = useState(false);
  const [identifyQueue, setIdentifyQueue] = useState<string[]>([]);
  const [identifyIndex, setIdentifyIndex] = useState(0);
  const pendingIdentify = useRef(readIdentifyFlag());
  const [editing, setEditing] = useState<TxView | null>(null);
  const [form, setForm] = useState(() => blankForm(year, month));
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TxType | "">("");
  const [natureFilter, setNatureFilter] = useState<TxNature | "">("");
  const [branchFilter, setBranchFilter] = useState<BranchId | "">("");
  const [movementFilter, setMovementFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"paid" | "pending" | "overdue" | "">("");
  const [dueDateFilter, setDueDateFilter] = useState("");
  const [paidDateFilter, setPaidDateFilter] = useState("");
  const [rateioFilter, setRateioFilter] = useState<"" | "yes" | "no">("");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [splitting, setSplitting] = useState<TxView | null>(null);
  const [splitEditing, setSplitEditing] = useState(false);
  const [splitParts, setSplitParts] = useState<SplitPartDraft[]>([]);
  const isMensalidadeTypeId = (typeId: string) =>
    isMensalidadeName((types.data ?? []).find((item) => item.id === typeId)?.name);
  const splitHasMensalidade = splitParts.some((part) => isMensalidadeTypeId(part.movementTypeId));
  /** Mensalidades em aberto por associado (somente leitura — não gera a grade de outros anos). */
  const [openMensalidades, setOpenMensalidades] = useState<Record<string, OpenMensalidade[] | "loading">>({});
  const splitMensalidadeMembers = splitParts
    .filter((part) => part.memberId && isMensalidadeTypeId(part.movementTypeId))
    .map((part) => part.memberId)
    .join(",");
  useEffect(() => {
    if (!splitMensalidadeMembers) return;
    for (const memberId of new Set(splitMensalidadeMembers.split(","))) {
      if (openMensalidades[memberId]) continue;
      setOpenMensalidades((current) => ({ ...current, [memberId]: "loading" }));
      void api<OpenMensalidade[]>(`/mensalidades/open?memberId=${encodeURIComponent(memberId)}`)
        .then((list) => setOpenMensalidades((current) => ({ ...current, [memberId]: list })))
        .catch(() => setOpenMensalidades((current) => ({ ...current, [memberId]: [] })));
    }
  }, [splitMensalidadeMembers, openMensalidades]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [notaFile, setNotaFile] = useState<File | null>(null);
  const [clearNota, setClearNota] = useState(false);
  const [viewingNota, setViewingNota] = useState<TxView | null>(null);
  const [uploadingNota, setUploadingNota] = useState<TxView | null>(null);
  const [allocateMensalidade, setAllocateMensalidade] = useState<TxView | null>(null);
  const [payConfirm, setPayConfirm] = useState<
    { mode: "single"; tx: TxView } | { mode: "split"; parts: TxView[] } | null
  >(null);
  const [payConfirmDate, setPayConfirmDate] = useState(todayISO);
  const [alsoSettleIds, setAlsoSettleIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<CashFlowSortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const reduceMotion = useReducedMotion();

  /** Outras mensalidades em aberto do mesmo associado no ano (adiantamento). */
  const payConfirmOtherMonths = useMemo(() => {
    if (!payConfirm || payConfirm.mode !== "single") return [];
    const tx = payConfirm.tx;
    if (!tx.memberId || !isMensalidadeName(tx.movementType?.name ?? "")) return [];
    const source = yearTxs.data ?? txs.data ?? [];
    return source
      .filter(
        (item) =>
          item.id !== tx.id &&
          item.memberId === tx.memberId &&
          item.paymentStatus !== "paid" &&
          isMensalidadeName(item.movementType?.name ?? ""),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [payConfirm, yearTxs.data, txs.data]);

  const payConfirmAdvanceTotal = useMemo(() => {
    if (!payConfirm || payConfirm.mode !== "single") return 0;
    let total = payConfirm.tx.amount;
    for (const id of alsoSettleIds) {
      const hit = payConfirmOtherMonths.find((item) => item.id === id);
      if (hit) total += hit.amount;
    }
    return total;
  }, [payConfirm, alsoSettleIds, payConfirmOtherMonths]);

  async function uploadNota(transactionId: string, file: File) {
    const body = new FormData();
    body.append("file", file);
    await api(`/transactions/${transactionId}/nota`, { method: "POST", body });
  }

  const unidentifiedTypeIds = useMemo(
    () => new Set((types.data ?? []).filter((item) => isUnidentifiedName(item.name)).map((item) => item.id)),
    [types.data],
  );
  const wantsUnidentified = movementFilter === "__unidentified__" || unidentifiedTypeIds.has(movementFilter);

  const periodSource = useMemo(() => {
    return wantsUnidentified && month ? (yearTxs.data ?? txs.data ?? []) : (txs.data ?? []);
  }, [wantsUnidentified, month, yearTxs.data, txs.data]);

  const txById = useMemo(() => {
    const map = new Map<string, TxView>();
    for (const tx of periodSource) map.set(tx.id, tx);
    return map;
  }, [periodSource]);

  const matchedIds = useMemo(() => {
    const term = query.trim().toLowerCase();
    const ids = new Set<string>();
    for (const t of periodSource) {
      if (typeFilter && t.type !== typeFilter) continue;
      if (natureFilter && t.nature !== natureFilter) continue;
      if (branchFilter && t.branch !== branchFilter) continue;
      if (wantsUnidentified) {
        if (!isUnidentifiedName(t.movementType?.name)) continue;
      } else if (movementFilter && t.movementTypeId !== movementFilter) {
        continue;
      }
      const settlement = settlementOf(t.paymentStatus, t.date);
      if (statusFilter && settlement !== statusFilter) continue;
      if (dueDateFilter && dueDateOf(t) !== dueDateFilter) continue;
      if (paidDateFilter) {
        const paid = paidDateOf(t);
        if (!paid || paid !== paidDateFilter) continue;
      }
      if (rateioFilter === "yes" && !t.splitGroupId) continue;
      if (rateioFilter === "no" && t.splitGroupId) continue;
      if (term) {
        if (
          !matchesQuery(term, [
            t.description,
            t.movementType?.name,
            t.member?.name,
            t.guardian?.name,
            t.guardian?.relationship,
            t.account?.holderName,
            t.createdByUser?.name,
            t.updatedByUser?.name,
            originLabel(t.origin, t.importSource),
            BRANCH_LABELS[t.branch],
            settlementLabel(settlement),
            dueDateOf(t),
            paidDateOf(t),
            t.arrearsMarker === "embed" ? "acordo mensalidade parcela" : "",
            t.arrearsMarker === "agreement" ? "acordo dívida" : "",
          ])
        ) {
          continue;
        }
      }
      ids.add(t.id);
    }
    return ids;
  }, [
    periodSource,
    query,
    typeFilter,
    natureFilter,
    branchFilter,
    movementFilter,
    statusFilter,
    dueDateFilter,
    paidDateFilter,
    rateioFilter,
    wantsUnidentified,
  ]);

  const displayRows = useMemo(() => {
    const searchActive = Boolean(query.trim());
    const rows = buildCashFlowDisplayRows(
      periodSource.map((t) => ({
        id: t.id,
        splitGroupId: t.splitGroupId,
        splitTotal: t.splitTotal,
        splitIndex: t.splitIndex,
        splitCount: t.splitCount,
        amount: t.amount,
        type: t.type,
        date: t.date,
        paidAt: t.paidAt,
        description: t.description,
        memberName: t.member?.name ?? null,
        movementTypeName: t.movementType?.name ?? null,
      })),
      matchedIds,
      searchActive,
    );
    return sortCashFlowDisplayRows(rows, txById, sortKey, sortDir);
  }, [periodSource, matchedIds, query, txById, sortKey, sortDir]);

  function toggleSort(column: CashFlowSortKey) {
    setSortDir((current) => nextSortDir(current, sortKey === column));
    setSortKey(column);
  }

  useEffect(() => {
    const forced = displayRows
      .filter((row): row is Extract<typeof row, { kind: "split" }> => row.kind === "split" && row.forceExpand)
      .map((row) => row.groupId);
    if (!forced.length) return;
    setExpandedGroups((current) => {
      const next = new Set(current);
      let changed = false;
      for (const id of forced) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [displayRows]);

  const unidentified = useMemo(() => {
    const source = month ? (yearTxs.data ?? []) : (txs.data ?? []);
    return [...source]
      .filter((item) => isUnidentifiedName(item.movementType?.name))
      .sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description));
  }, [month, yearTxs.data, txs.data]);

  const sicredi = useFetch<{ configured: boolean; mock: boolean; lastSyncAt?: string }>(
    `/integrations/sicredi?from=${from}&to=${to}`,
  );

  const listing = usePagedList(
    displayRows,
    [
      query,
      typeFilter,
      natureFilter,
      branchFilter,
      movementFilter,
      statusFilter,
      dueDateFilter,
      paidDateFilter,
      rateioFilter,
      from,
      to,
      sortKey,
      sortDir,
      wantsUnidentified ? "year" : "period",
    ].join("|"),
  );

  function toggleSplitGroup(groupId: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const selectedMember = (members.data ?? []).find((m) => m.id === form.memberId);
  const selectedGuardians = selectedMember?.role === "jovem" ? (selectedMember.guardians ?? []) : [];
  const allowedTypes = useMemo(() => {
    const list = (types.data ?? []).filter(
      (item) => item.active && (item.direction === "both" || item.direction === form.type),
    );
    const current = (types.data ?? []).find((item) => item.id === form.movementTypeId);
    if (current && !list.some((item) => item.id === current.id)) {
      return [current, ...list];
    }
    return list;
  }, [types.data, form.type, form.movementTypeId]);

  function suggestProjectId(movementTypeId: string, branch: BranchId) {
    if (!movementTypeId) return "";
    const list = projects.data ?? [];
    const sameBranch = list.find(
      (project) => project.branch === branch && project.items.some((item) => item.movementTypeId === movementTypeId),
    );
    if (sameBranch) return sameBranch.id;
    return list.find((project) => project.items.some((item) => item.movementTypeId === movementTypeId))?.id ?? "";
  }

  const selectedMovement = (types.data ?? []).find((item) => item.id === form.movementTypeId);
  const feeLaunch = isMensalidadeName(selectedMovement?.name);

  function onMemberChange(memberId: string) {
    const member = (members.data ?? []).find((m) => m.id === memberId);
    const primary = member?.accounts.find((a) => a.isPrimary && a.active) ?? member?.accounts[0];
    const firstGuardian = member?.role === "jovem" ? (member.guardians?.[0]?.id ?? "") : "";
    setForm({
      ...form,
      memberId,
      memberAccountId: primary?.id ?? "",
      memberGuardianId: firstGuardian,
      branch: member?.branch ?? form.branch,
    });
  }

  function closeForm() {
    setOpen(false);
    setIdentifyQueue([]);
    setIdentifyIndex(0);
    setEditing(null);
    setForm(blankForm(year, month));
    setNotaFile(null);
    setClearNota(false);
    setError(null);
    setAttempted(false);
  }

  function openEdit(
    tx: TxView,
    options?: {
      identifyQueue?: string[];
      identifyIndex?: number;
    },
  ) {
    const stamp = tx.date.slice(0, 10);
    const nextYear = Number(stamp.slice(0, 4));
    const nextMonth = Number(stamp.slice(5, 7));
    if (options?.identifyQueue?.length && nextYear && nextMonth && (nextYear !== year || nextMonth !== month)) {
      setYear(nextYear);
      setMonth(nextMonth);
    }
    setIdentifyQueue(options?.identifyQueue ?? []);
    setIdentifyIndex(options?.identifyIndex ?? 0);
    setEditing(tx);
    const isFee = isMensalidadeName(tx.movementType?.name);
    setForm({
      date: stamp,
      paidAt: tx.paymentStatus === "pending" ? "" : tx.paidAt?.slice(0, 10) || (isFee ? "" : stamp),
      type: tx.type,
      nature: tx.nature,
      movementTypeId: isUnidentifiedName(tx.movementType?.name) ? "" : tx.movementTypeId,
      description: tx.description,
      amount: formatMoney(tx.amount),
      branch: tx.branch,
      method: tx.method,
      paymentStatus: tx.paymentStatus ?? "paid",
      memberId: tx.memberId ?? "",
      memberAccountId: tx.memberAccountId ?? "",
      memberGuardianId: tx.memberGuardianId ?? "",
      projectId: tx.projectId ?? "",
    });
    setNotaFile(null);
    setClearNota(false);
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function startIdentifyQueue(list: TxView[], fromId?: string) {
    if (!list.length) return;
    const start = fromId
      ? Math.max(
          0,
          list.findIndex((item) => item.id === fromId),
        )
      : 0;
    const queue = list.slice(start);
    const ids = queue.map((item) => item.id);
    openEdit(queue[0]!, { identifyQueue: ids, identifyIndex: 0 });
  }

  function skipIdentify() {
    const nextIndex = identifyIndex + 1;
    const nextId = identifyQueue[nextIndex];
    const next = unidentified.find((item) => item.id === nextId) ?? (txs.data ?? []).find((item) => item.id === nextId);
    if (!next) {
      closeForm();
      toast.success("Não há mais lançamentos para identificar neste lote.");
      return;
    }
    openEdit(next, { identifyQueue, identifyIndex: nextIndex });
  }

  function openCreate() {
    setIdentifyQueue([]);
    setIdentifyIndex(0);
    setEditing(null);
    setForm(blankForm(year, month));
    setNotaFile(null);
    setClearNota(false);
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  async function advanceIdentifyQueueAfterSave() {
    if (!identifyQueue.length) return false;
    const nextIndex = identifyIndex + 1;
    const nextId = identifyQueue[nextIndex];
    const next =
      unidentified.find((item) => item.id === nextId) ??
      (txs.data ?? []).find((item) => item.id === nextId) ??
      (yearTxs.data ?? []).find((item) => item.id === nextId);
    await Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
    if (!nextId || !next) {
      toast.success(
        nextIndex >= identifyQueue.length
          ? "Todos os lançamentos deste lote foram salvos."
          : "Lançamento salvo. Fim do lote.",
      );
      return false;
    }
    openEdit(next, { identifyQueue, identifyIndex: nextIndex });
    toast.success("Lançamento salvo. Confira o próximo.");
    return true;
  }

  async function onSave(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    setError(null);
    const amount = parseMoney(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const dueDate = form.date;
    const paymentDate = form.paidAt.trim();
    if (!dueDate) return;
    if (form.paymentStatus === "paid" && !paymentDate) {
      setError(feeLaunch ? "Informe a data de pagamento da mensalidade" : "Informe a data de pagamento");
      return;
    }
    setSaving(true);
    const payload = {
      date: dueDate,
      type: form.type,
      nature: form.nature,
      movementTypeId: form.movementTypeId,
      description: form.description,
      branch: form.branch,
      method: form.method,
      paymentStatus: form.paymentStatus,
      paidAt: form.paymentStatus === "paid" ? paymentDate : null,
      amount,
      memberId: form.memberId || null,
      memberAccountId: form.memberAccountId || null,
      memberGuardianId: form.memberGuardianId || null,
      projectId: form.projectId || null,
    };
    try {
      if (editing) {
        const selectedType = (types.data ?? []).find((item) => item.id === form.movementTypeId);
        if (identifyQueue.length && (!selectedType || isUnidentifiedName(selectedType.name))) {
          setError("Escolha o tipo de movimentação antes de salvar");
          setSaving(false);
          return;
        }
        await api(`/transactions/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (clearNota && (editing.hasNota || editing.notaKey) && !notaFile) {
          await api(`/transactions/${editing.id}/nota`, { method: "DELETE" });
        }
        if (notaFile) {
          await uploadNota(editing.id, notaFile);
        }
        if (await advanceIdentifyQueueAfterSave()) {
          return;
        }
        toast.success(identifyQueue.length ? "Lançamento identificado." : "Lançamento alterado com sucesso.");
      } else {
        const created = await api<{ id: string }>("/transactions", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            memberId: form.memberId || undefined,
            memberAccountId: form.memberAccountId || undefined,
            memberGuardianId: form.memberGuardianId || undefined,
            projectId: form.projectId || undefined,
          }),
        });
        if (notaFile) {
          await uploadNota(created.id, notaFile);
        }
        toast.success("Lançamento cadastrado com sucesso.");
      }
      closeForm();
      void Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o lançamento");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    await api(`/transactions/${id}`, { method: "DELETE" });
    toast.success("Lançamento excluído com sucesso.");
    await Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
  }

  function openSplit(tx: TxView) {
    setOpenMensalidades({});
    const half = Math.round((tx.amount / 2) * 100) / 100;
    const rest = Math.round((tx.amount - half) * 100) / 100;
    const amounts = [half, rest];
    setSplitEditing(false);
    setSplitting(tx);
    setSplitParts(
      amounts.map((amount, index) => ({
        amount: formatMoney(amount),
        movementTypeId: index === 0 ? tx.movementTypeId : "",
        memberId: index === 0 ? (tx.memberId ?? "") : "",
        competence: "",
        autoDescription: true,
        description: buildSplitPartDescription({
          baseDescription: tx.description,
          partIndex: index + 1,
          partCount: amounts.length,
          partAmount: amount,
          totalAmount: tx.amount,
          memberName: index === 0 ? tx.member?.name : undefined,
        }),
      })),
    );
    setError(null);
  }

  function openEditSplit(parts: TxView[]) {
    setOpenMensalidades({});
    const sorted = [...parts].sort((a, b) => (a.splitIndex ?? 0) - (b.splitIndex ?? 0) || a.id.localeCompare(b.id));
    if (sorted.length < 2) return;
    const primary = sorted.find((item) => item.splitIndex === 1) ?? sorted[0];
    const total = primary.splitTotal ?? sorted.reduce((sum, item) => sum + item.amount, 0);
    const baseDescription = splitGroupLabel(sorted);
    setSplitEditing(true);
    setSplitting({
      ...primary,
      amount: total,
      description: baseDescription,
    });
    setSplitParts(
      sorted.map((part) => ({
        amount: formatMoney(part.amount),
        movementTypeId: part.movementTypeId,
        memberId: part.memberId ?? "",
        competence: isMensalidadeName(part.movementType?.name) ? part.date.slice(0, 7) : "",
        autoDescription: false,
        description: part.description,
      })),
    );
    setError(null);
  }

  function refreshSplitDescriptions(parts: SplitPartDraft[], totalAmount: number, baseDescription: string) {
    return parts.map((part, index) => {
      if (!part.autoDescription) return part;
      const memberName = (members.data ?? []).find((item) => item.id === part.memberId)?.name;
      if (isMensalidadeTypeId(part.movementTypeId) && part.competence) {
        const monthName = MONTHS[Number(part.competence.slice(5, 7)) - 1];
        const label = `Mensalidade ${monthName} ${part.competence.slice(0, 4)}`;
        return { ...part, description: memberName ? `${label} — ${memberName}` : label };
      }
      return {
        ...part,
        description: buildSplitPartDescription({
          baseDescription,
          partIndex: index + 1,
          partCount: parts.length,
          partAmount: parseMoney(part.amount) || 0,
          totalAmount,
          memberName,
        }),
      };
    });
  }

  /** Meses em aberto do associado, mais o já escolhido ao alterar o rateio. */
  function splitCompetenceOptions(memberId: string, current: string) {
    const list = openMensalidades[memberId];
    const options = (Array.isArray(list) ? list : []).map((item) => {
      const amounts =
        item.onTimeAmount === item.lateAmount
          ? brl(item.onTimeAmount)
          : `pontual ${brl(item.onTimeAmount)} · atraso ${brl(item.lateAmount)}`;
      return {
        value: item.yearMonth,
        label: `${MONTHS[item.month - 1]} ${item.year} · ${item.status === "overdue" ? "vencida" : "pendente"} · ${amounts}`,
      };
    });
    if (current && !options.some((item) => item.value === current)) {
      options.unshift({
        value: current,
        label: `${MONTHS[Number(current.slice(5, 7)) - 1]} ${current.slice(0, 4)} · este rateio`,
      });
    }
    return options;
  }

  function updateSplitPart(index: number, patch: Partial<SplitPartDraft>) {
    if (!splitting) return;
    setSplitParts((current) => {
      const next = current.map((part, i) => (i === index ? { ...part, ...patch } : part));
      return refreshSplitDescriptions(next, splitting.amount, splitting.description);
    });
  }

  async function saveSplit(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    if (!splitting) return;
    const parts = splitParts.map((part) => ({
      amount: parseMoney(part.amount),
      movementTypeId: part.movementTypeId,
      description: part.description.trim(),
      memberId: part.memberId || null,
      competence: isMensalidadeTypeId(part.movementTypeId) ? part.competence || null : null,
    }));
    if (parts.some((part) => !(part.amount > 0) || !part.movementTypeId || part.description.length < 2)) {
      setError("Preencha valor, tipo e descrição de cada parte.");
      return;
    }
    const missingMonth = parts.findIndex(
      (part) => isMensalidadeTypeId(part.movementTypeId) && (!part.memberId || !part.competence),
    );
    if (missingMonth >= 0) {
      setError(`Parte ${missingMonth + 1}: informe o associado e o mês que a mensalidade quita.`);
      return;
    }
    const competenceKeys = parts.filter((part) => part.competence).map((part) => `${part.memberId}:${part.competence}`);
    if (new Set(competenceKeys).size !== competenceKeys.length) {
      setError("O mesmo mês do mesmo associado aparece em mais de uma parte.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(`/transactions/${splitting.id}/split`, {
        method: "POST",
        body: JSON.stringify({ parts }),
      });
      toast.success(splitEditing ? "Rateio atualizado." : "Lançamento rateado.");
      setSplitting(null);
      setSplitEditing(false);
      void Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ratear");
    } finally {
      setSaving(false);
    }
  }

  async function removeSplitGroup(parts: TxView[]) {
    if (!confirm(`Excluir este rateio e suas ${parts.length} partes?`)) return;
    for (const part of parts) {
      await api(`/transactions/${part.id}`, { method: "DELETE" });
    }
    toast.success("Rateio excluído.");
    await Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
  }

  function askMarkAsPaid(target: { mode: "single"; tx: TxView } | { mode: "split"; parts: TxView[] }) {
    setPayConfirmDate(todayISO());
    setAlsoSettleIds([]);
    setPayConfirm(target);
  }

  function closePayConfirm() {
    setPayConfirm(null);
    setAlsoSettleIds([]);
  }

  async function setSplitGroupPaymentStatus(parts: TxView[], paymentStatus: TxPaymentStatus, paidAt?: string) {
    const paymentDate = (paidAt?.trim() || todayISO()).slice(0, 10);
    await Promise.all(
      parts.map((part) =>
        api(`/transactions/${part.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            paymentStatus,
            paidAt: paymentStatus === "paid" ? paymentDate : null,
          }),
        }),
      ),
    );
    toast.success(
      paymentStatus === "paid" ? "Partes do rateio conciliadas." : "Partes do rateio marcadas como pendentes.",
    );
    await Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
  }

  async function setPaymentStatus(tx: TxView, paymentStatus: TxPaymentStatus, paidAt?: string) {
    const paymentDate = (paidAt?.trim() || todayISO()).slice(0, 10);
    await api(`/transactions/${tx.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        paymentStatus,
        paidAt: paymentStatus === "paid" ? paymentDate : null,
      }),
    });
    toast.success(
      paymentStatus === "paid" ? "Lançamento conciliado com sucesso." : "Lançamento marcado como pendente.",
    );
    await Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
  }

  async function confirmMarkAsPaid() {
    if (!payConfirm) return;
    const paidAt = payConfirmDate.trim() || todayISO();
    const extras = [...alsoSettleIds];
    const target = payConfirm;
    closePayConfirm();
    if (target.mode === "single") {
      const isFee = isMensalidadeName(target.tx.movementType?.name ?? "");
      if (isFee && extras.length) {
        const transactionIds = [target.tx.id, ...extras.filter((id) => id !== target.tx.id)];
        try {
          const result = await api<{ amount: number; settled?: number }>("/mensalidades/settle", {
            method: "PATCH",
            body: JSON.stringify({
              transactionIds,
              timing: "on_time",
              paidAt,
              notifyReceipt: true,
            }),
          });
          const count = result.settled ?? transactionIds.length;
          toast.success(
            count === 1
              ? `Mensalidade registrada (${brl(result.amount)}).`
              : `${count} mensalidades registradas (${brl(result.amount)}).`,
          );
          await Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Não foi possível registrar o pagamento");
        }
        return;
      }
      await setPaymentStatus(target.tx, "paid", paidAt);
      return;
    }
    await setSplitGroupPaymentStatus(target.parts, "paid", paidAt);
  }

  async function pullSicredi(quiet = false) {
    if (!sicredi.data?.configured) return;
    try {
      const result = await api<{ created: number; paid: number }>("/integrations/sicredi/sync", {
        method: "POST",
        body: JSON.stringify({ from, to }),
      });
      if (result.created || result.paid) {
        await Promise.all([flow.reload(), txs.reload(), yearTxs.reload(), sicredi.reload()]);
        if (!quiet) {
          toast.success(
            `${result.created ? `${result.created} Pix no caixa` : ""}${
              result.created && result.paid ? " · " : ""
            }${result.paid ? `${result.paid} conciliação(ões)` : ""}.`,
          );
        }
      } else {
        await sicredi.reload();
      }
    } catch (err) {
      if (!quiet) {
        setError(err instanceof Error ? err.message : "Não foi possível ler o Sicredi");
      }
    }
  }

  const sicrediReady = Boolean(sicredi.data?.configured);

  useEffect(() => {
    if (!sicrediReady) return;
    void pullSicredi(true);
    const timer = window.setInterval(() => {
      void pullSicredi(true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [sicrediReady, from, to]);

  useEffect(() => {
    if (!pendingIdentify.current || !unidentified.length) return;
    pendingIdentify.current = false;
    clearIdentifyFlag();
    startIdentifyQueue(unidentified);
  }, [unidentified]);

  function renderTxRow(
    t: TxView,
    options: { allowSplit: boolean; nested?: boolean; key?: string; animIndex?: number },
  ) {
    const settlement = settlementOf(t.paymentStatus, t.date);
    const unidentifiedRow = isUnidentifiedName(t.movementType?.name);
    const canAllocateMensalidades =
      Boolean(options.allowSplit) &&
      t.type === "income" &&
      settlement === "paid" &&
      !t.splitGroupId &&
      (unidentifiedRow || isMensalidadeName(t.movementType?.name)) &&
      !(t.member && matchesMensalidadeAmount(t.member, t.amount));
    const dueDate = dueDateOf(t);
    const paidDate = paidDateOf(t);
    const RowTag = options.nested ? motion.tr : "tr";
    const motionProps = options.nested
      ? reduceMotion
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: duration.fast },
          }
        : {
            initial: { opacity: 0, y: -22 },
            animate: { opacity: 1, y: 0 },
            exit: {
              opacity: 0,
              y: -12,
              transition: { duration: 0.32, ease },
            },
            transition: {
              duration: 0.72,
              ease,
              delay: (options.animIndex ?? 0) * 0.09,
            },
          }
      : {};
    return (
      <RowTag
        key={options.key ?? t.id}
        className={`is-${settlement}${unidentifiedRow ? " is-unidentified" : ""}${options.nested ? " tx-split-part" : ""}`}
        {...motionProps}
      >
        <td>{dueDate ? formatDate(dueDate) : "—"}</td>
        <td>{paidDate ? formatDate(paidDate) : "—"}</td>
        <td>
          {options.nested ? (
            <div className="tx-split-part__label">
              <Badge kind="split">
                Parte {t.splitIndex ?? "?"}
                {t.splitCount ? `/${t.splitCount}` : ""}
              </Badge>
              <strong>{t.description}</strong>
              {t.arrearsMarker === "embed" ? (
                <span className="arrears-flag arrears-flag--embed" title="Mensalidade com parcela de acordo">
                  <FaLink aria-hidden /> +acordo
                </span>
              ) : null}
              {t.arrearsMarker === "agreement" ? (
                <span className="arrears-flag arrears-flag--agreement" title="Lançamento de acordo / dívida">
                  <FaHandHoldingUsd aria-hidden /> Acordo
                </span>
              ) : null}
              {t.hasNota || t.notaKey ? (
                <span className="nota-flag" title={t.notaFileName || "Nota anexada"}>
                  <FaFileAlt aria-hidden /> Nota
                </span>
              ) : null}
            </div>
          ) : (
            <div className="tx-desc-row">
              <strong>{t.description}</strong>
              {t.arrearsMarker === "embed" ? (
                <span className="arrears-flag arrears-flag--embed" title="Mensalidade com parcela de acordo">
                  <FaLink aria-hidden /> +acordo
                </span>
              ) : null}
              {t.arrearsMarker === "agreement" ? (
                <span className="arrears-flag arrears-flag--agreement" title="Lançamento de acordo / dívida">
                  <FaHandHoldingUsd aria-hidden /> Acordo
                </span>
              ) : null}
              {t.hasNota || t.notaKey ? (
                <span className="nota-flag" title={t.notaFileName || "Nota anexada"}>
                  <FaFileAlt aria-hidden /> Nota
                </span>
              ) : null}
            </div>
          )}
          <div className="muted">
            {t.member ? `${t.member.name} · ` : ""}
            {t.guardian ? `${t.guardian.name} (${t.guardian.relationship}) · ` : ""}
            {t.account ? `${t.account.holderName} · ` : ""}
            {methodLabel(t.method)}
          </div>
          <RecordStamp
            origin={t.origin}
            importSource={t.importSource}
            createdAt={t.createdAt}
            createdBy={t.createdByUser}
            updatedAt={t.updatedAt}
            updatedBy={t.updatedByUser}
          />
        </td>
        <td>
          <Badge kind={t.type}>{t.movementType?.name ?? "—"}</Badge>
        </td>
        <td>
          <span className="branch-dot" style={{ background: colorOf(t.branch) }} /> {BRANCH_LABELS[t.branch]}
        </td>
        <td>
          <Badge kind={t.nature}>{natureLabel(t.nature)}</Badge>
        </td>
        <td>
          <div className="settlement-tags">
            {settlement === "paid" ? (
              <Badge kind="paid">{settlementLabel(settlement)}</Badge>
            ) : (
              <>
                <Badge kind="unreconciled">Ainda não conciliado</Badge>
                <Badge kind={settlement}>{settlementLabel(settlement)}</Badge>
              </>
            )}
          </div>
        </td>
        <td className={`num ${signedClass(t.type === "income" ? t.amount : -t.amount)}`}>
          {t.type === "income" ? "+" : "−"} {brl(t.amount)}
        </td>
        <td className="cell-actions">
          {unidentifiedRow ? (
            <IconButton label="Identificar tipo" onClick={() => startIdentifyQueue(unidentified, t.id)}>
              <FaTag />
            </IconButton>
          ) : null}
          {settlement === "paid" ? (
            <IconButton label="Marcar como pendente" onClick={() => void setPaymentStatus(t, "pending")}>
              <FaClock />
            </IconButton>
          ) : (
            <IconButton
              label="Marcar como pago"
              tone="success"
              onClick={() => askMarkAsPaid({ mode: "single", tx: t })}
            >
              <FaCheck />
            </IconButton>
          )}
          <IconButton label="Alterar lançamento" onClick={() => openEdit(t)}>
            <FaPen />
          </IconButton>
          {t.hasNota || t.notaKey ? (
            <IconButton label="Ver nota ampliada" onClick={() => setViewingNota(t)}>
              <FaExpand />
            </IconButton>
          ) : (
            <IconButton label="Anexar nota de conciliação" onClick={() => setUploadingNota(t)}>
              <FaPaperclip />
            </IconButton>
          )}
          {canAllocateMensalidades ? (
            <IconButton label="Baixar mensalidades deste Pix" onClick={() => setAllocateMensalidade(t)}>
              <FaCalendarAlt />
            </IconButton>
          ) : null}
          {options.allowSplit ? (
            <IconButton label="Ratear lançamento" onClick={() => openSplit(t)}>
              <FaCodeBranch />
            </IconButton>
          ) : null}
          <IconButton label="Excluir lançamento" tone="danger" onClick={() => void remove(t.id)}>
            <FaTrashAlt />
          </IconButton>
        </td>
      </RowTag>
    );
  }

  const data = flow.data;
  if (!data) {
    if (flow.error) return <p className="error">{flow.error}</p>;
    return <PageLoader label="Carregando fluxo de caixa…" />;
  }

  const refreshing = (flow.loading || txs.loading) && Boolean(flow.data);
  const periodIncome = data.months.reduce((s, m) => s + m.income, 0);
  const periodExpense = data.months.reduce((s, m) => s + m.expense, 0);

  return (
    <div>
      <PageHeader
        kicker="Fluxo de caixa"
        title="Entradas e saídas"
        subtitle="Lançamentos do caixa: pago em verde, pendente em amarelo, vencido em vermelho. Tag azul marca o que ainda não foi conciliado. Pix do Sicredi entra pela Integração; linhas sem tipo ficam para identificar."
        actions={
          <div className="page-head__actions">
            <PageGuide guide={cashFlowGuide} />
            <button className="btn btn-primary" type="button" onClick={openCreate}>
              Lançamento manual
            </button>
          </div>
        }
      />

      <FetchOverlay active={refreshing} label="Atualizando lançamentos…">
        <div className="grid-stats">
          <StatCard title="Saldo inicial" value={brl(data.opening)} hint="Antes do período" />
          <StatCard title="Entradas no período" value={brl(periodIncome)} tone="pos" />
          <StatCard title="Saídas no período" value={brl(periodExpense)} tone="neg" />
          <StatCard title="Saldo atual" value={brl(data.closing)} />
        </div>

        {unidentified.length ? (
          <article className="card identify-banner">
            <div>
              <strong>
                {unidentified.length === 1
                  ? "1 lançamento sem tipo definido"
                  : `${unidentified.length} lançamentos sem tipo definido`}
              </strong>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                Vieram do extrato e ainda não têm tipo de movimentação. Ao identificar, você edita todos os campos
                (tipo, valor, datas, associado, ramo…).
              </p>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => startIdentifyQueue(unidentified)}>
              Identificar agora
            </button>
          </article>
        ) : null}

        <article className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Lançamentos</h3>
          <FilterBar>
            <PeriodField year={year} month={month} setYear={setYear} setMonth={setMonth} />
            <label className="field">
              <span>Buscar</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Descrição, associado, tipo…"
              />
            </label>
            <label className="field">
              <span>Entrada / saída</span>
              <SearchableSelect
                value={typeFilter}
                onChange={(value) => setTypeFilter(value as TxType | "")}
                placeholder="Todas"
                options={[
                  { value: "", label: "Todas" },
                  { value: "income", label: "Entrada" },
                  { value: "expense", label: "Saída" },
                ]}
              />
            </label>
            <label className="field">
              <span>Natureza</span>
              <SearchableSelect
                value={natureFilter}
                onChange={(value) => setNatureFilter(value as TxNature | "")}
                placeholder="Todas"
                options={[
                  { value: "", label: "Todas" },
                  { value: "fixed", label: "Fixa" },
                  { value: "variable", label: "Variável" },
                ]}
              />
            </label>
            <label className="field">
              <span>Ramo</span>
              <SearchableSelect
                value={branchFilter}
                onChange={(value) => setBranchFilter(value as BranchId | "")}
                placeholder="Todos"
                options={[
                  { value: "", label: "Todos" },
                  ...ALL_BRANCHES.map((id) => ({ value: id, label: BRANCH_LABELS[id] })),
                ]}
              />
            </label>
            <label className="field">
              <span>Tipo de movimentação</span>
              <SearchableSelect
                value={movementFilter}
                onChange={setMovementFilter}
                placeholder="Todos"
                searchPlaceholder="Buscar tipo…"
                options={[
                  { value: "", label: "Todos" },
                  { value: "__unidentified__", label: "Não identificado" },
                  ...(types.data ?? [])
                    .filter((t) => !isUnidentifiedName(t.name))
                    .map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
            </label>
            <label className="field">
              <span>Conciliação</span>
              <SearchableSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as "paid" | "pending" | "overdue" | "")}
                placeholder="Todas"
                options={[
                  { value: "", label: "Todas" },
                  { value: "paid", label: "Pago" },
                  { value: "pending", label: "Pendente" },
                  { value: "overdue", label: "Vencido" },
                ]}
              />
            </label>
            <label className="field">
              <span>Vencimento</span>
              <input type="date" value={dueDateFilter} onChange={(e) => setDueDateFilter(e.target.value)} />
            </label>
            <label className="field">
              <span>Pagamento</span>
              <input type="date" value={paidDateFilter} onChange={(e) => setPaidDateFilter(e.target.value)} />
            </label>
            <label className="field">
              <span>Com rateio</span>
              <SearchableSelect
                value={rateioFilter}
                onChange={(value) => setRateioFilter(value as "" | "yes" | "no")}
                placeholder="Todos"
                options={[
                  { value: "", label: "Todos" },
                  { value: "yes", label: "Sim" },
                  { value: "no", label: "Não" },
                ]}
              />
            </label>
          </FilterBar>
          {month && wantsUnidentified ? (
            <p className="muted" style={{ margin: "-4px 0 12px" }}>
              Inclui lançamentos sem tipo de todos os meses de {year}.
            </p>
          ) : null}

          <ListingResults fetching={refreshing} filtering={listing.busy} fetchLabel="Atualizando lançamentos…">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <SortableTh
                      label="Vencimento"
                      column="dueDate"
                      active={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableTh
                      label="Movimentação"
                      column="paidDate"
                      active={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableTh
                      label="Lançamento"
                      column="description"
                      active={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableTh label="Tipo" column="movementType" active={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableTh label="Ramo" column="branch" active={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableTh label="Natureza" column="nature" active={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableTh
                      label="Conciliação"
                      column="settlement"
                      active={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableTh
                      label="Valor"
                      column="amount"
                      active={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                      align="right"
                    />
                    <th className="cell-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="muted">
                        Nenhum lançamento com esses filtros.
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence initial={false}>
                      {listing.pageRows.flatMap((row) => {
                        if (row.kind === "single") {
                          const t = txById.get(row.txId);
                          if (!t) return [];
                          return [renderTxRow(t, { allowSplit: !t.splitGroupId })];
                        }

                        const parts = row.partIds
                          .map((id) => txById.get(id))
                          .filter((item): item is TxView => Boolean(item));
                        if (!parts.length) return [];
                        const expanded = expandedGroups.has(row.groupId);
                        const headSettlement = groupSettlementOf(parts);
                        const allPaid = parts.every((part) => settlementOf(part.paymentStatus, part.date) === "paid");
                        const dueDate = dueDateOf(parts[0]);
                        const paidDates = parts.map((part) => paidDateOf(part)).filter(Boolean);
                        const paidDate =
                          allPaid && paidDates.length ? (new Set(paidDates).size === 1 ? paidDates[0] : "") : "";
                        const mixedSettlement =
                          !allPaid && parts.some((part) => settlementOf(part.paymentStatus, part.date) === "paid");
                        const mixedTypes = new Set(parts.map((p) => p.movementType?.name).filter(Boolean));
                        const typeLabelText =
                          mixedTypes.size === 1 ? ([...mixedTypes][0] as string) : `${row.partCount} partes`;

                        const head = (
                          <tr
                            key={row.id}
                            className={`is-${headSettlement} tx-split-group${expanded ? " is-expanded" : ""}`}
                          >
                            <td>{dueDate ? formatDate(dueDate) : "—"}</td>
                            <td>{paidDate ? formatDate(paidDate) : "—"}</td>
                            <td>
                              <button
                                type="button"
                                className="tx-split-toggle"
                                aria-expanded={expanded}
                                onClick={() => toggleSplitGroup(row.groupId)}
                              >
                                <FaChevronDown className="tx-split-chevron" aria-hidden />
                                <span className="tx-split-toggle__text">
                                  <strong>{row.label}</strong>
                                  <span className="muted">
                                    {methodLabel(parts[0].method)}
                                    {parts[0].account ? ` · ${parts[0].account.holderName}` : ""}
                                  </span>
                                </span>
                              </button>
                              <div className="tx-split-summary">
                                <Badge kind="split">
                                  Rateio · {row.partCount} {row.partCount === 1 ? "parte" : "partes"}
                                </Badge>
                                {row.beneficiaries ? (
                                  <span className="muted">Para: {row.beneficiaries}</span>
                                ) : (
                                  <span className="muted">Abra para ver cada emissão do rateio</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <Badge kind={row.type}>{typeLabelText}</Badge>
                            </td>
                            <td>
                              <div className="tx-split-branches">
                                {uniqueSplitBranches(parts).map((branch) => (
                                  <span key={branch} className="tx-split-branches__item">
                                    <span className="branch-dot" style={{ background: colorOf(branch) }} />{" "}
                                    {BRANCH_LABELS[branch]}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <Badge kind={parts[0].nature}>{natureLabel(parts[0].nature)}</Badge>
                            </td>
                            <td>
                              <div className="settlement-tags">
                                {allPaid ? (
                                  <Badge kind="paid">{settlementLabel("paid")}</Badge>
                                ) : (
                                  <>
                                    <Badge kind="unreconciled">
                                      {mixedSettlement ? "Conciliação parcial" : "Ainda não conciliado"}
                                    </Badge>
                                    <Badge kind={headSettlement}>{settlementLabel(headSettlement)}</Badge>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className={`num ${signedClass(row.type === "income" ? row.total : -row.total)}`}>
                              {row.type === "income" ? "+" : "−"} {brl(row.total)}
                              <div className="split-amount-meta muted">crédito original</div>
                            </td>
                            <td className="cell-actions">
                              <IconButton
                                label={expanded ? "Recolher rateio" : "Ver partes do rateio"}
                                onClick={() => toggleSplitGroup(row.groupId)}
                              >
                                <FaChevronDown className={`tx-split-chevron${expanded ? " is-open" : ""}`} />
                              </IconButton>
                              {allPaid ? (
                                <IconButton
                                  label="Marcar partes como pendentes"
                                  onClick={() => void setSplitGroupPaymentStatus(parts, "pending")}
                                >
                                  <FaClock />
                                </IconButton>
                              ) : (
                                <IconButton
                                  label="Marcar partes como pagas"
                                  tone="success"
                                  onClick={() => askMarkAsPaid({ mode: "split", parts })}
                                >
                                  <FaCheck />
                                </IconButton>
                              )}
                              <IconButton label="Alterar rateio" onClick={() => openEditSplit(parts)}>
                                <FaCodeBranch />
                              </IconButton>
                              <IconButton
                                label="Excluir rateio"
                                tone="danger"
                                onClick={() => void removeSplitGroup(parts)}
                              >
                                <FaTrashAlt />
                              </IconButton>
                            </td>
                          </tr>
                        );

                        if (!expanded) return [head];

                        return [
                          head,
                          ...parts.map((t, index) =>
                            renderTxRow(t, {
                              allowSplit: false,
                              nested: true,
                              key: `${row.groupId}:${t.id}`,
                              animIndex: index,
                            }),
                          ),
                        ];
                      })}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>

            <Pager
              total={listing.total}
              fromRow={listing.fromRow}
              toRow={listing.toRow}
              pageSize={listing.pageSize}
              currentPage={listing.currentPage}
              pageCount={listing.pageCount}
              onPageSize={listing.setPageSize}
              onPage={listing.setPage}
            />
          </ListingResults>
        </article>
      </FetchOverlay>

      <AnimatePresence>
        {open ? (
          <Modal
            key={editing ? `edit-${editing.id}` : "create"}
            title={
              editing
                ? identifyQueue.length > 1
                  ? `Alterar lançamento · ${identifyIndex + 1} de ${identifyQueue.length}`
                  : "Alterar lançamento"
                : "Lançamento manual"
            }
            onClose={closeForm}
          >
            <form onSubmit={onSave} className={formClass("form-grid", attempted)} noValidate>
              {error ? <div className="error wide">{error}</div> : null}
              <label className="field">
                <span>Vencimento</span>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Data de pagamento</span>
                <input
                  required={form.paymentStatus === "paid"}
                  type="date"
                  value={form.paidAt}
                  disabled={form.paymentStatus === "pending"}
                  onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                />
                {form.paymentStatus === "pending" ? (
                  <small className="muted">Disponível ao marcar a situação como pago/conciliado.</small>
                ) : null}
              </label>
              <label className="field">
                <span>Situação</span>
                <SearchableSelect
                  required
                  value={form.paymentStatus}
                  placeholder="Selecione"
                  onChange={(value) => {
                    const paymentStatus = value as TxPaymentStatus;
                    setForm({
                      ...form,
                      paymentStatus,
                      paidAt: paymentStatus === "pending" ? "" : form.paidAt || form.date || todayISO(),
                    });
                  }}
                  options={[
                    { value: "paid", label: "Pago" },
                    { value: "pending", label: "Pendente" },
                  ]}
                />
              </label>
              <label className="field">
                <span>Entrada ou saída</span>
                <SearchableSelect
                  required
                  value={form.type}
                  placeholder="Selecione"
                  onChange={(value) => setForm({ ...form, type: value as TxType, movementTypeId: "" })}
                  options={[
                    { value: "income", label: "Entrada" },
                    { value: "expense", label: "Saída" },
                  ]}
                />
              </label>
              <div className="field">
                <span>
                  Conta fixa ou variável
                  <abbr className="req" title="Obrigatório">
                    *
                  </abbr>
                </span>
                <div className="flag-row">
                  <button
                    type="button"
                    className={`flag ${form.nature === "fixed" ? "is-on" : ""}`}
                    onClick={() => setForm({ ...form, nature: "fixed" })}
                  >
                    Fixa
                  </button>
                  <button
                    type="button"
                    className={`flag ${form.nature === "variable" ? "is-on" : ""}`}
                    onClick={() => setForm({ ...form, nature: "variable" })}
                  >
                    Variável
                  </button>
                </div>
              </div>
              <label className="field">
                <span>Tipo de movimentação</span>
                <SearchableSelect
                  required
                  value={form.movementTypeId}
                  placeholder="Selecione"
                  searchPlaceholder="Buscar tipo…"
                  onChange={(movementTypeId) => {
                    const next = (types.data ?? []).find((item) => item.id === movementTypeId);
                    const branch = next?.branch || form.branch;
                    setForm({
                      ...form,
                      movementTypeId,
                      nature: next ? natureForTypeName(next.name) : form.nature,
                      date: form.date || form.paidAt,
                      paidAt: form.paymentStatus === "paid" ? form.paidAt || form.date : form.paidAt,
                      branch,
                      projectId: form.projectId || suggestProjectId(movementTypeId, branch),
                    });
                  }}
                  options={[
                    { value: "", label: "Selecione" },
                    ...allowedTypes.map((t) => ({
                      value: t.id,
                      label: `${t.name}${t.branch && t.branch !== "grupo" ? ` · ${BRANCH_LABELS[t.branch]}` : ""}${
                        !t.active ? " (inativo)" : ""
                      }${t.direction !== "both" && t.direction !== form.type ? " · direção diferente" : ""}`,
                    })),
                  ]}
                />
              </label>
              <label className="field wide">
                <span>Descrição</span>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  minLength={2}
                />
              </label>
              <label className={`field${attempted && !(parseMoney(form.amount) > 0) ? " is-invalid" : ""}`}>
                <span>Valor (R$)</span>
                <input
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: maskMoney(e.target.value) })}
                  placeholder="0,00"
                  required
                />
              </label>
              <label className="field">
                <span>Ramo</span>
                <SearchableSelect
                  required
                  value={form.branch}
                  placeholder="Selecione"
                  onChange={(value) => {
                    const branch = value as BranchId;
                    setForm({
                      ...form,
                      branch,
                      projectId: form.projectId || suggestProjectId(form.movementTypeId, branch),
                    });
                  }}
                  options={ALL_BRANCHES.map((id) => ({ value: id, label: BRANCH_LABELS[id] }))}
                />
              </label>
              <label className="field">
                <span>Associado (opcional)</span>
                <SearchableSelect
                  value={form.memberId}
                  onChange={onMemberChange}
                  placeholder="Sem associado"
                  searchPlaceholder="Buscar associado…"
                  options={[
                    { value: "", label: "Sem associado" },
                    ...(members.data ?? []).map((m) => ({
                      value: m.id,
                      label: `${m.name} · ${BRANCH_LABELS[m.branch]}`,
                    })),
                  ]}
                />
              </label>
              {selectedMember?.role === "jovem" ? (
                <label className="field">
                  <span>Responsável</span>
                  <SearchableSelect
                    value={form.memberGuardianId}
                    onChange={(memberGuardianId) => setForm({ ...form, memberGuardianId })}
                    placeholder="Não informar"
                    searchPlaceholder="Buscar responsável…"
                    options={[
                      { value: "", label: "Não informar" },
                      ...selectedGuardians.map((guardian) => ({
                        value: guardian.id,
                        label: `${guardian.name} · ${guardian.relationship}`,
                      })),
                    ]}
                  />
                  {selectedGuardians.length === 0 ? (
                    <span className="muted">Cadastre o responsável no associado para vincular neste lançamento.</span>
                  ) : null}
                </label>
              ) : null}
              <label className="field">
                <span>Conta do pagamento</span>
                <SearchableSelect
                  value={form.memberAccountId}
                  onChange={(memberAccountId) => setForm({ ...form, memberAccountId })}
                  placeholder="Não informar"
                  searchPlaceholder="Buscar conta…"
                  disabled={!selectedMember}
                  options={[
                    { value: "", label: "Não informar" },
                    ...(selectedMember?.accounts ?? []).map((a) => ({
                      value: a.id,
                      label: `${a.holderName} · ${a.relationship}`,
                    })),
                  ]}
                />
              </label>
              <label className="field">
                <span>Previsão de gastos</span>
                <SearchableSelect
                  value={form.projectId}
                  onChange={(projectId) => setForm({ ...form, projectId })}
                  placeholder="Nenhuma"
                  searchPlaceholder="Buscar previsão…"
                  options={[
                    { value: "", label: "Nenhuma" },
                    ...(projects.data ?? []).map((p) => ({
                      value: p.id,
                      label: `${p.name}${p.branch ? ` · ${BRANCH_LABELS[p.branch]}` : ""}`,
                    })),
                  ]}
                />
              </label>
              <label className="field">
                <span>Meio</span>
                <SearchableSelect
                  required
                  value={form.method}
                  placeholder="Selecione"
                  onChange={(value) => setForm({ ...form, method: value as PaymentMethod })}
                  options={[
                    { value: "pix", label: "Pix" },
                    { value: "transfer", label: "Transferência" },
                    { value: "cash", label: "Dinheiro" },
                    { value: "card", label: "Cartão" },
                    { value: "other", label: "Outro" },
                  ]}
                />
              </label>
              <label className="field wide">
                <span>Nota (PDF ou imagem)</span>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    setNotaFile(e.target.files?.[0] ?? null);
                    setClearNota(false);
                  }}
                />
                {notaFile ? (
                  <small className="muted">
                    <FaFileAlt aria-hidden /> {notaFile.name}
                  </small>
                ) : editing && (editing.hasNota || editing.notaKey) && !clearNota ? (
                  <small className="nota-attached">
                    <FaFileAlt aria-hidden /> {editing.notaFileName || "Nota anexada"}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setViewingNota(editing)}>
                      Ver ampliada
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setClearNota(true);
                        setNotaFile(null);
                      }}
                    >
                      Remover
                    </button>
                  </small>
                ) : clearNota ? (
                  <small className="muted">A nota será removida ao salvar.</small>
                ) : (
                  <small className="muted">Opcional. Até 10 MB.</small>
                )}
              </label>
              <p className="muted wide">
                Natureza: {natureLabel(form.nature)} · {typeLabel(form.type)}
                {selectedMember ? ` · ${selectedMember.name}` : ""}
              </p>
              <div className="modal-actions wide">
                {identifyQueue.length > 1 ? (
                  <button className="btn btn-ghost" type="button" onClick={skipIdentify} disabled={saving}>
                    Pular
                  </button>
                ) : (
                  <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>
                    Cancelar
                  </button>
                )}
                <SubmitButton busy={saving} busyLabel={editing ? "Salvando…" : "Lançando…"}>
                  {editing ? (identifyQueue.length ? "Salvar e continuar" : "Salvar alteração") : "Lançar"}
                </SubmitButton>
              </div>
            </form>
          </Modal>
        ) : null}
        {splitting ? (
          <Modal
            title={splitEditing ? "Alterar rateio" : "Ratear lançamento"}
            onClose={() => {
              setSplitting(null);
              setSplitEditing(false);
            }}
          >
            <form onSubmit={(event) => void saveSplit(event)} className={formClass("form-grid", attempted)} noValidate>
              {error ? <div className="error wide">{error}</div> : null}
              <p className="muted wide">
                {formatDate(splitting.date)} · total {brl(splitting.amount)} · {splitting.description}. Cada parte vira
                um lançamento; a soma precisa ser exatamente o total. Serve para qualquer tipo (mensalidade, projeto,
                cantina, despesas etc.): escolha a rubrica e, se fizer sentido, o <strong>associado</strong> em cada
                parte — o fluxo de caixa mantém o valor original e mostra para quem foi o rateio.
              </p>
              {splitHasMensalidade ? (
                <p className="muted wide">
                  Em cada parte do tipo <strong>Mensalidade</strong>, escolha o associado e o{" "}
                  <strong>mês que ela quita</strong> (adiantamento ou atrasado). É esse mês que recebe a baixa na tela
                  Mensalidades; a data do PIX fica como data de pagamento.
                </p>
              ) : null}
              {splitParts.map((part, index) => (
                <div key={index} className="wide form-grid split-part">
                  <label className="field">
                    <span>Parte {index + 1} (R$)</span>
                    <input
                      required
                      inputMode="decimal"
                      value={part.amount}
                      onChange={(e) => updateSplitPart(index, { amount: maskMoney(e.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>Tipo</span>
                    <SearchableSelect
                      required
                      value={part.movementTypeId}
                      placeholder="Selecione"
                      searchPlaceholder="Buscar tipo…"
                      onChange={(movementTypeId) => updateSplitPart(index, { movementTypeId, competence: "" })}
                      options={[
                        { value: "", label: "Selecione" },
                        ...(types.data ?? [])
                          .filter(
                            (item) => item.active && (item.direction === "both" || item.direction === splitting.type),
                          )
                          .map((item) => ({
                            value: item.id,
                            label: `${item.name}${
                              item.branch && item.branch !== "grupo" ? ` · ${BRANCH_LABELS[item.branch]}` : ""
                            }`,
                          })),
                      ]}
                    />
                  </label>
                  <label className="field">
                    <span>Associado (opcional)</span>
                    <SearchableSelect
                      value={part.memberId}
                      placeholder="Sem associado"
                      searchPlaceholder="Buscar associado…"
                      onChange={(memberId) => updateSplitPart(index, { memberId, competence: "" })}
                      options={[
                        { value: "", label: "Sem associado" },
                        ...(members.data ?? [])
                          .filter((item) => item.status === "active")
                          .map((item) => ({
                            value: item.id,
                            label: `${item.name}${item.branch ? ` · ${BRANCH_LABELS[item.branch]}` : ""}`,
                          })),
                      ]}
                    />
                  </label>
                  {isMensalidadeTypeId(part.movementTypeId) ? (
                    <label className="field wide">
                      <span>Mês que esta mensalidade quita</span>
                      {!part.memberId ? (
                        <small className="muted">Selecione o associado para ver os meses em aberto.</small>
                      ) : openMensalidades[part.memberId] === "loading" ? (
                        <small className="muted">Carregando meses em aberto…</small>
                      ) : splitCompetenceOptions(part.memberId, part.competence).length === 0 ? (
                        <small className="error">Este associado não tem mensalidade em aberto.</small>
                      ) : (
                        <SearchableSelect
                          required
                          value={part.competence}
                          placeholder="Selecione o mês"
                          searchPlaceholder="Buscar mês…"
                          onChange={(competence) => updateSplitPart(index, { competence })}
                          options={[
                            { value: "", label: "Selecione o mês" },
                            ...splitCompetenceOptions(part.memberId, part.competence),
                          ]}
                        />
                      )}
                      <small className="muted">
                        A baixa vai para este mês na grade de Mensalidades, independente da data do PIX.
                      </small>
                    </label>
                  ) : null}
                  <label className="field wide">
                    <span>Descrição</span>
                    <input
                      required
                      minLength={2}
                      value={part.description}
                      onChange={(e) => updateSplitPart(index, { description: e.target.value, autoDescription: false })}
                    />
                  </label>
                </div>
              ))}
              <div className="modal-actions wide">
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => {
                    if (!splitting) return;
                    setSplitParts((current) => {
                      const next: SplitPartDraft[] = [
                        ...current,
                        {
                          amount: "",
                          movementTypeId: "",
                          memberId: "",
                          competence: "",
                          description: "",
                          autoDescription: true,
                        },
                      ];
                      return refreshSplitDescriptions(next, splitting.amount, splitting.description);
                    });
                  }}
                >
                  Outra parte
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    setSplitting(null);
                    setSplitEditing(false);
                  }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <SubmitButton busy={saving} busyLabel={splitEditing ? "Salvando…" : "Rateando…"}>
                  {splitEditing ? "Salvar rateio" : "Ratear"}
                </SubmitButton>
              </div>
            </form>
          </Modal>
        ) : null}
        {viewingNota ? (
          <NotaViewer
            key={`nota-${viewingNota.id}`}
            transactionId={viewingNota.id}
            fileName={viewingNota.notaFileName}
            onClose={() => setViewingNota(null)}
          />
        ) : null}
        {uploadingNota ? (
          <NotaUploadModal
            key={`upload-${uploadingNota.id}`}
            tx={uploadingNota}
            onClose={() => setUploadingNota(null)}
            onUploaded={() => {
              toast.success("Nota anexada ao lançamento.");
              void Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
            }}
          />
        ) : null}
        {allocateMensalidade ? (
          <AllocateMensalidadesModal
            key={`allocate-${allocateMensalidade.id}`}
            transactionId={allocateMensalidade.id}
            creditAmount={allocateMensalidade.amount}
            creditPaidAt={allocateMensalidade.paidAt ?? allocateMensalidade.date}
            creditDescription={allocateMensalidade.description}
            initialMemberId={allocateMensalidade.memberId ?? ""}
            members={members.data ?? []}
            onClose={() => setAllocateMensalidade(null)}
            onDone={(message) => {
              setAllocateMensalidade(null);
              toast.success(message);
              void Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
            }}
          />
        ) : null}
        {payConfirm ? (
          <Modal
            key="pay-confirm"
            title={payConfirm.mode === "split" ? "Marcar partes como pagas" : "Marcar como pago"}
            onClose={closePayConfirm}
          >
            <p className="muted">
              {payConfirm.mode === "split"
                ? `Confirme a data de pagamento das ${payConfirm.parts.length} partes do rateio.`
                : `Confirme a data de pagamento de “${payConfirm.tx.description}”.`}
            </p>
            <label className="field">
              <span>Data de pagamento</span>
              <input type="date" value={payConfirmDate} onChange={(e) => setPayConfirmDate(e.target.value)} />
              <small className="muted">Se deixar em branco, usamos a data de hoje.</small>
            </label>
            {payConfirm.mode === "single" && payConfirmOtherMonths.length ? (
              <fieldset className="field wide" style={{ border: "none", padding: 0, margin: 0 }}>
                <legend className="muted" style={{ marginBottom: 8 }}>
                  Baixar também outros meses (adiantamento)
                </legend>
                {payConfirmOtherMonths.map((item) => {
                  const monthNum = Number(item.date.slice(5, 7));
                  const checked = alsoSettleIds.includes(item.id);
                  return (
                    <label key={item.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setAlsoSettleIds((current) =>
                            e.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                          )
                        }
                      />
                      <span>
                        {MONTHS[monthNum - 1] ?? item.date.slice(0, 7)} · {brl(item.amount)}
                        {item.member?.name ? ` · ${item.member.name}` : ""}
                      </span>
                    </label>
                  );
                })}
                {alsoSettleIds.length ? (
                  <p className="muted" style={{ marginTop: 8 }}>
                    Total com adiantamento: <strong>{brl(payConfirmAdvanceTotal)}</strong> ({1 + alsoSettleIds.length}{" "}
                    mensalidades)
                  </p>
                ) : null}
              </fieldset>
            ) : null}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={closePayConfirm}>
                Cancelar
              </button>
              <button type="button" className="btn" onClick={() => void confirmMarkAsPaid()}>
                Confirmar pagamento
                {payConfirm.mode === "single" && alsoSettleIds.length ? ` (${1 + alsoSettleIds.length} meses)` : ""}
              </button>
            </div>
          </Modal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function colorOf(branch: BranchId): string {
  if (branch === "grupo") return "#4BA3E3";
  return YOUTH_BRANCHES.find((b) => b.id === branch)?.color ?? "#0c2d6b";
}
