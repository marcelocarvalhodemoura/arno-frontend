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
} from "@/domain";
import PageHeader from "@/shared/ui/PageHeader";
import IdentifyPaymentsGuide from "@/shared/ui/IdentifyPaymentsGuide";
import Modal from "@/shared/ui/Modal";
import StatCard, { Badge } from "@/shared/ui/StatCard";
import RecordStamp from "@/shared/ui/RecordStamp";
import PageLoader from "@/shared/ui/PageLoader";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import ListingResults from "@/shared/ui/ListingResults";
import SubmitButton from "@/shared/ui/SubmitButton";
import FilterBar from "@/shared/ui/FilterBar";
import Pager from "@/shared/ui/Pager";
import IconButton from "@/shared/ui/IconButton";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  FaBroadcastTower,
  FaCheck,
  FaChevronDown,
  FaClock,
  FaPen,
  FaTag,
  FaTrashAlt,
  FaCodeBranch,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/shared/feedback/toast";
import { api } from "@/core/http";
import {
  brl,
  formatDate,
  methodLabel,
  natureLabel,
  originLabel,
  dueDateOf,
  paidDateOf,
  settlementLabel,
  settlementOf,
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
import { buildCashFlowDisplayRows, splitGroupLabel } from "@/features/cash-flow/split-display";

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
};

type SplitPartDraft = {
  amount: string;
  movementTypeId: string;
  description: string;
  memberId: string;
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
  const navigate = useNavigate();
  const { year, month, setYear, setMonth } = usePeriod();
  const { from, to } = periodRange(year, month);
  const flow = useFetch<Flow>(`/reports/cashflow?from=${from}&to=${to}`);
  const txs = useFetch<TxView[]>(`/transactions?from=${from}&to=${to}`);
  const yearTxs = useFetch<TxView[]>(month ? `/transactions?from=${year}-01-01&to=${year}-12-31` : null);
  const types = useFetch<MovementType[]>("/movement-types");
  const members = useFetch<MemberOption[]>("/members");
  const projects = useFetch<FinancialProject[]>(`/projects?year=${year || 2026}`);
  const [open, setOpen] = useState(false);
  const [identifying, setIdentifying] = useState<TxView | null>(null);
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const reduceMotion = useReducedMotion();

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
            originLabel(t.origin),
            BRANCH_LABELS[t.branch],
            settlementLabel(settlement),
            dueDateOf(t),
            paidDateOf(t),
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
    return buildCashFlowDisplayRows(
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
  }, [periodSource, matchedIds, query]);

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
  const [liveSyncing, setLiveSyncing] = useState(false);

  const identifyTypes = useMemo(() => {
    if (!identifying) return [];
    return (types.data ?? []).filter(
      (item) =>
        item.active &&
        !isUnidentifiedName(item.name) &&
        (item.direction === "both" || item.direction === identifying.type),
    );
  }, [types.data, identifying]);

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
    setIdentifying(null);
    setIdentifyQueue([]);
    setIdentifyIndex(0);
    setEditing(null);
    setForm(blankForm(year, month));
    setError(null);
    setAttempted(false);
  }

  function showIdentify(tx: TxView) {
    const stamp = tx.date.slice(0, 10);
    const nextYear = Number(stamp.slice(0, 4));
    const nextMonth = Number(stamp.slice(5, 7));
    if (nextYear && nextMonth && (nextYear !== year || nextMonth !== month)) {
      setYear(nextYear);
      setMonth(nextMonth);
    }
    setOpen(false);
    setEditing(null);
    setIdentifying(tx);
    setForm({
      date: stamp,
      paidAt: tx.paidAt?.slice(0, 10) || (tx.paymentStatus === "paid" ? stamp : ""),
      type: tx.type,
      nature: tx.nature,
      movementTypeId: "",
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
    setError(null);
    setAttempted(false);
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
    setIdentifyQueue(queue.map((item) => item.id));
    setIdentifyIndex(0);
    showIdentify(queue[0]!);
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
    setIdentifyIndex(nextIndex);
    showIdentify(next);
  }

  function openCreate() {
    setIdentifying(null);
    setIdentifyQueue([]);
    setEditing(null);
    setForm(blankForm(year, month));
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function openEdit(tx: TxView) {
    setIdentifying(null);
    setIdentifyQueue([]);
    setEditing(tx);
    setForm({
      date: tx.date.slice(0, 10),
      paidAt:
        tx.paidAt?.slice(0, 10) ||
        (tx.paymentStatus === "paid" && !isMensalidadeName(tx.movementType?.name) ? tx.date.slice(0, 10) : ""),
      type: tx.type,
      nature: tx.nature,
      movementTypeId: tx.movementTypeId,
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
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  async function onSave(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    setError(null);
    const amount = parseMoney(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const dueDate = form.date;
    const paymentDate = form.paidAt;
    if (!dueDate) return;
    if (form.paymentStatus === "paid" && !paymentDate) {
      setError(feeLaunch ? "Informe a data de pagamento da mensalidade" : "Informe a data de pagamento");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      date: dueDate,
      paidAt: form.paymentStatus === "paid" ? paymentDate || dueDate : null,
      amount,
      memberId: form.memberId || null,
      memberAccountId: form.memberAccountId || null,
      memberGuardianId: form.memberGuardianId || null,
      projectId: form.projectId || null,
    };
    try {
      if (editing) {
        await api(`/transactions/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Lançamento alterado com sucesso.");
      } else {
        await api("/transactions", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            memberId: form.memberId || undefined,
            memberAccountId: form.memberAccountId || undefined,
            memberGuardianId: form.memberGuardianId || undefined,
            projectId: form.projectId || undefined,
          }),
        });
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

  async function onIdentify(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    if (!identifying) return;
    const movement = (types.data ?? []).find((item) => item.id === form.movementTypeId);
    if (!movement || isUnidentifiedName(movement.name)) {
      setError("Escolha o tipo de movimentação");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(`/transactions/${identifying.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          movementTypeId: movement.id,
          nature: natureForTypeName(movement.name),
          branch: form.branch,
          memberId: form.memberId || null,
          memberGuardianId: form.memberGuardianId || null,
        }),
      });
      const nextId = identifyQueue[identifyIndex + 1];
      const next = unidentified.find((item) => item.id === nextId);
      if (next) {
        setIdentifyIndex((index) => index + 1);
        showIdentify(next);
        toast.success("Tipo definido. Confira o próximo lançamento.");
      } else {
        closeForm();
        toast.success("Lançamento identificado.");
      }
      void Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível identificar o lançamento");
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
    }));
    if (parts.some((part) => !(part.amount > 0) || !part.movementTypeId || part.description.length < 2)) {
      setError("Preencha valor, tipo e descrição de cada parte.");
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

  async function setSplitGroupPaymentStatus(parts: TxView[], paymentStatus: TxPaymentStatus) {
    await Promise.all(
      parts.map((part) =>
        api(`/transactions/${part.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            paymentStatus,
            paidAt: paymentStatus === "paid" ? todayISO() : null,
          }),
        }),
      ),
    );
    toast.success(
      paymentStatus === "paid" ? "Partes do rateio conciliadas." : "Partes do rateio marcadas como pendentes.",
    );
    await Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
  }

  async function setPaymentStatus(tx: TxView, paymentStatus: TxPaymentStatus) {
    await api(`/transactions/${tx.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        paymentStatus,
        paidAt: paymentStatus === "paid" ? todayISO() : null,
      }),
    });
    toast.success(
      paymentStatus === "paid" ? "Lançamento conciliado com sucesso." : "Lançamento marcado como pendente.",
    );
    await Promise.all([flow.reload(), txs.reload(), yearTxs.reload()]);
  }

  async function pullSicredi(quiet = false) {
    if (!sicredi.data?.configured) return;
    setLiveSyncing(true);
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
    } finally {
      setLiveSyncing(false);
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
            </div>
          ) : (
            <strong>{t.description}</strong>
          )}
          <div className="muted">
            {t.member ? `${t.member.name} · ` : ""}
            {t.guardian ? `${t.guardian.name} (${t.guardian.relationship}) · ` : ""}
            {t.account ? `${t.account.holderName} · ` : ""}
            {methodLabel(t.method)}
          </div>
          <RecordStamp
            origin={t.origin}
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
          <Badge kind={settlement}>{settlementLabel(settlement)}</Badge>
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
            <IconButton label="Marcar como pago" tone="success" onClick={() => void setPaymentStatus(t, "paid")}>
              <FaCheck />
            </IconButton>
          )}
          <IconButton label="Alterar lançamento" onClick={() => openEdit(t)}>
            <FaPen />
          </IconButton>
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
        subtitle="Lançamentos do caixa com conciliação: pago em verde, pendente em amarelo e vencido em vermelho. O Pix do Sicredi entra sozinho; linhas sem tipo ficam para identificar."
        actions={
          <div className="page-head__actions">
            {sicredi.data?.configured ? (
              <button
                className="btn btn-outline"
                type="button"
                disabled={liveSyncing}
                onClick={() => void pullSicredi()}
              >
                <span className={`live-dot${liveSyncing ? " is-spin" : ""}`} />
                {liveSyncing ? "Lendo Sicredi…" : "Sicredi ao vivo"}
              </button>
            ) : sicredi.data ? (
              <button className="btn btn-outline" type="button" onClick={() => navigate("/integracao")}>
                <FaBroadcastTower /> Ligar Sicredi
              </button>
            ) : null}
            <button className="btn btn-primary" type="button" onClick={openCreate}>
              Lançamento manual
            </button>
          </div>
        }
      />

      <IdentifyPaymentsGuide />

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
                Vieram do extrato e ainda não têm tipo de movimentação. Identifique um a um: tipo, associado e ramo.
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
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TxType | "")}>
                <option value="">Todas</option>
                <option value="income">Entrada</option>
                <option value="expense">Saída</option>
              </select>
            </label>
            <label className="field">
              <span>Natureza</span>
              <select value={natureFilter} onChange={(e) => setNatureFilter(e.target.value as TxNature | "")}>
                <option value="">Todas</option>
                <option value="fixed">Fixa</option>
                <option value="variable">Variável</option>
              </select>
            </label>
            <label className="field">
              <span>Ramo</span>
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value as BranchId | "")}>
                <option value="">Todos</option>
                {ALL_BRANCHES.map((id) => (
                  <option key={id} value={id}>
                    {BRANCH_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Tipo de movimentação</span>
              <select value={movementFilter} onChange={(e) => setMovementFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="__unidentified__">Não identificado</option>
                {(types.data ?? [])
                  .filter((t) => !isUnidentifiedName(t.name))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Conciliação</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "paid" | "pending" | "overdue" | "")}
              >
                <option value="">Todas</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
                <option value="overdue">Vencido</option>
              </select>
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
              <select value={rateioFilter} onChange={(e) => setRateioFilter(e.target.value as "" | "yes" | "no")}>
                <option value="">Todos</option>
                <option value="yes">Sim</option>
                <option value="no">Não</option>
              </select>
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
                    <th>Vencimento</th>
                    <th>Pagamento</th>
                    <th>Lançamento</th>
                    <th>Tipo</th>
                    <th>Ramo</th>
                    <th>Natureza</th>
                    <th>Conciliação</th>
                    <th className="num">Valor</th>
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
                          return [renderTxRow(t, { allowSplit: true })];
                        }

                        const parts = row.partIds
                          .map((id) => txById.get(id))
                          .filter((item): item is TxView => Boolean(item));
                        if (!parts.length) return [];
                        const expanded = expandedGroups.has(row.groupId);
                        const headSettlement = settlementOf(parts[0].paymentStatus, parts[0].date);
                        const allPaid = parts.every((part) => settlementOf(part.paymentStatus, part.date) === "paid");
                        const dueDate = dueDateOf(parts[0]);
                        const paidDate = paidDateOf(parts[0]);
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
                              <span className="branch-dot" style={{ background: colorOf(parts[0].branch) }} />{" "}
                              {BRANCH_LABELS[parts[0].branch]}
                            </td>
                            <td>
                              <Badge kind={parts[0].nature}>{natureLabel(parts[0].nature)}</Badge>
                            </td>
                            <td>
                              <Badge kind={headSettlement}>{settlementLabel(headSettlement)}</Badge>
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
                                  onClick={() => void setSplitGroupPaymentStatus(parts, "paid")}
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
          <Modal title={editing ? "Alterar lançamento" : "Lançamento manual"} onClose={closeForm}>
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
                  onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Situação</span>
                <select
                  required
                  value={form.paymentStatus}
                  onChange={(e) => {
                    const paymentStatus = e.target.value as TxPaymentStatus;
                    setForm({
                      ...form,
                      paymentStatus,
                      paidAt:
                        paymentStatus === "pending"
                          ? ""
                          : paymentStatus === "paid"
                            ? form.paidAt || form.date || todayISO()
                            : form.paidAt,
                    });
                  }}
                >
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                </select>
              </label>
              <label className="field">
                <span>Entrada ou saída</span>
                <select
                  required
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as TxType, movementTypeId: "" })}
                >
                  <option value="income">Entrada</option>
                  <option value="expense">Saída</option>
                </select>
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
                <select
                  required
                  value={form.movementTypeId}
                  onChange={(e) => {
                    const movementTypeId = e.target.value;
                    const next = (types.data ?? []).find((item) => item.id === movementTypeId);
                    setForm({
                      ...form,
                      movementTypeId,
                      date: form.date || form.paidAt,
                      paidAt: form.paymentStatus === "paid" ? form.paidAt || form.date : form.paidAt,
                      branch: next?.branch || form.branch,
                    });
                  }}
                >
                  <option value="">Selecione</option>
                  {allowedTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.branch && t.branch !== "grupo" ? ` · ${BRANCH_LABELS[t.branch]}` : ""}
                      {!t.active ? " (inativo)" : ""}
                      {t.direction !== "both" && t.direction !== form.type ? " · direção diferente" : ""}
                    </option>
                  ))}
                </select>
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
                <select
                  required
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value as BranchId })}
                >
                  {ALL_BRANCHES.map((id) => (
                    <option key={id} value={id}>
                      {BRANCH_LABELS[id]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Associado (opcional)</span>
                <select value={form.memberId} onChange={(e) => onMemberChange(e.target.value)}>
                  <option value="">Sem associado</option>
                  {(members.data ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {BRANCH_LABELS[m.branch]}
                    </option>
                  ))}
                </select>
              </label>
              {selectedMember?.role === "jovem" ? (
                <label className="field">
                  <span>Responsável</span>
                  <select
                    value={form.memberGuardianId}
                    onChange={(e) => setForm({ ...form, memberGuardianId: e.target.value })}
                  >
                    <option value="">Não informar</option>
                    {selectedGuardians.map((guardian) => (
                      <option key={guardian.id} value={guardian.id}>
                        {guardian.name} · {guardian.relationship}
                      </option>
                    ))}
                  </select>
                  {selectedGuardians.length === 0 ? (
                    <span className="muted">Cadastre o responsável no associado para vincular neste lançamento.</span>
                  ) : null}
                </label>
              ) : null}
              <label className="field">
                <span>Conta do pagamento</span>
                <select
                  value={form.memberAccountId}
                  onChange={(e) => setForm({ ...form, memberAccountId: e.target.value })}
                  disabled={!selectedMember}
                >
                  <option value="">Não informar</option>
                  {(selectedMember?.accounts ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.holderName} · {a.relationship}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Projeto financeiro</span>
                <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                  <option value="">Nenhum</option>
                  {(projects.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Meio</span>
                <select
                  required
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
                >
                  <option value="pix">Pix</option>
                  <option value="transfer">Transferência</option>
                  <option value="cash">Dinheiro</option>
                  <option value="card">Cartão</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <p className="muted wide">
                Natureza: {natureLabel(form.nature)} · {typeLabel(form.type)}
                {selectedMember ? ` · ${selectedMember.name}` : ""}
              </p>
              <div className="modal-actions wide">
                <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>
                  Cancelar
                </button>
                <SubmitButton busy={saving} busyLabel={editing ? "Salvando…" : "Lançando…"}>
                  {editing ? "Salvar alteração" : "Lançar"}
                </SubmitButton>
              </div>
            </form>
          </Modal>
        ) : null}
        {identifying ? (
          <Modal
            title={
              identifyQueue.length > 1
                ? `Identificar lançamento · ${identifyIndex + 1} de ${identifyQueue.length}`
                : "Identificar lançamento"
            }
            onClose={closeForm}
          >
            <form onSubmit={(event) => void onIdentify(event)} className={formClass("form-grid", attempted)} noValidate>
              {error ? <div className="error wide">{error}</div> : null}
              <p className="muted wide">
                {formatDate(identifying.date)} · {typeLabel(identifying.type)} · {brl(identifying.amount)}
                <br />
                {identifying.description}
              </p>
              <label className="field wide">
                <span>
                  Tipo de movimentação
                  <abbr className="req" title="Obrigatório">
                    *
                  </abbr>
                </span>
                <select
                  required
                  value={form.movementTypeId}
                  onChange={(e) => {
                    const movement = (types.data ?? []).find((item) => item.id === e.target.value);
                    setForm({
                      ...form,
                      movementTypeId: e.target.value,
                      nature: movement ? natureForTypeName(movement.name) : form.nature,
                      branch: movement?.branch || form.branch,
                    });
                  }}
                >
                  <option value="">Selecione o tipo</option>
                  {identifyTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.branch && item.branch !== "grupo" ? ` · ${BRANCH_LABELS[item.branch]}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Associado (opcional)</span>
                <select value={form.memberId} onChange={(e) => onMemberChange(e.target.value)}>
                  <option value="">Sem associado</option>
                  {(members.data ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {BRANCH_LABELS[m.branch]}
                    </option>
                  ))}
                </select>
              </label>
              {selectedMember?.role === "jovem" ? (
                <label className="field">
                  <span>Responsável</span>
                  <select
                    value={form.memberGuardianId}
                    onChange={(e) => setForm({ ...form, memberGuardianId: e.target.value })}
                  >
                    <option value="">Não informar</option>
                    {selectedGuardians.map((guardian) => (
                      <option key={guardian.id} value={guardian.id}>
                        {guardian.name} · {guardian.relationship}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="field">
                <span>Ramo</span>
                <select
                  required
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value as BranchId })}
                >
                  {ALL_BRANCHES.map((id) => (
                    <option key={id} value={id}>
                      {BRANCH_LABELS[id]}
                    </option>
                  ))}
                </select>
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
                <SubmitButton busy={saving} busyLabel="Identificando…">
                  Identificar
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
                um lançamento; a soma precisa ser exatamente o total. Em mensalidade de irmãos, escolha o{" "}
                <strong>associado</strong> em cada parte — o fluxo de caixa mostra o valor original e para quem foi o
                rateio.
              </p>
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
                    <select
                      required
                      value={part.movementTypeId}
                      onChange={(e) => updateSplitPart(index, { movementTypeId: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {(types.data ?? [])
                        .filter(
                          (item) => item.active && (item.direction === "both" || item.direction === splitting.type),
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                            {item.branch && item.branch !== "grupo" ? ` · ${BRANCH_LABELS[item.branch]}` : ""}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Associado (opcional)</span>
                    <select
                      value={part.memberId}
                      onChange={(e) => updateSplitPart(index, { memberId: e.target.value })}
                    >
                      <option value="">Sem associado</option>
                      {(members.data ?? [])
                        .filter((item) => item.status === "active")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                            {item.branch ? ` · ${BRANCH_LABELS[item.branch]}` : ""}
                          </option>
                        ))}
                    </select>
                  </label>
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
      </AnimatePresence>
    </div>
  );
}

function colorOf(branch: BranchId): string {
  if (branch === "grupo") return "#4BA3E3";
  return YOUTH_BRANCHES.find((b) => b.id === branch)?.color ?? "#0c2d6b";
}
