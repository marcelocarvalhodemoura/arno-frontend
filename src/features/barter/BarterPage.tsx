import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FaPlus } from "react-icons/fa";
import { isAdminRole, type Member, type MemberGuardian, type MovementType } from "@/domain";
import { api } from "@/core/http";
import { useAuth } from "@/features/auth/AuthProvider";
import { useFetch } from "@/shared/hooks/use-fetch";
import { useToast } from "@/shared/feedback/toast";
import { brl, formatDate, formatDateTime, MONTHS, todayISO } from "@/shared/lib/format";
import { matchesQuery } from "@/shared/lib/listing";
import { maskMoney, parseMoney } from "@/shared/lib/masks";
import { AnimatedRow, AnimatedTableBody } from "@/shared/ui/AnimatedTable";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import FilterBar from "@/shared/ui/FilterBar";
import Modal from "@/shared/ui/Modal";
import PageHeader from "@/shared/ui/PageHeader";
import PageLoader from "@/shared/ui/PageLoader";
import SearchableSelect from "@/shared/ui/SearchableSelect";
import StatCard, { Badge } from "@/shared/ui/StatCard";
import SubmitButton from "@/shared/ui/SubmitButton";

type BarterStatus = "pending" | "approving" | "approved" | "rejected";

type PlanItem = { transactionId: string; memberId: string; memberName: string; dueDate: string; amount: number };

type Plan = {
  memberIds: string[];
  items: PlanItem[];
  coveredAmount: number;
  donationAmount: number;
  nextOpen?: PlanItem;
};

type BarterView = {
  id: string;
  memberId?: string;
  memberName?: string;
  donorName: string;
  service: string;
  amount: number;
  serviceDate: string;
  expenseTypeName: string;
  donationTypeName: string;
  notes: string;
  status: BarterStatus;
  decisionNote: string;
  coveredAmount?: number;
  donationAmount?: number;
  createdAt: string;
  createdByName?: string;
  decidedAt?: string;
  decidedByName?: string;
  plan?: Plan;
  planError?: string;
  settled: PlanItem[];
};

type MemberWithGuardians = Member & { guardians?: MemberGuardian[] };

type Tab = "pending" | "approved" | "rejected";

const TABS: { id: Tab; label: string; statuses: BarterStatus[]; empty: string }[] = [
  {
    id: "pending",
    label: "Aguardando a diretoria",
    statuses: ["pending", "approving"],
    empty: "Nenhuma permuta esperando aprovação.",
  },
  { id: "approved", label: "Aprovadas", statuses: ["approved"], empty: "Nenhuma permuta aprovada ainda." },
  { id: "rejected", label: "Recusadas", statuses: ["rejected"], empty: "Nenhuma permuta recusada." },
];

const STATUS: Record<BarterStatus, { label: string; badge: string }> = {
  pending: { label: "Aguardando a diretoria", badge: "pending" },
  approving: { label: "Aprovando…", badge: "pending" },
  approved: { label: "Aprovada", badge: "paid" },
  rejected: { label: "Recusada", badge: "overdue" },
};

function monthOf(item: PlanItem) {
  const month = Number(item.dueDate.slice(5, 7));
  return `${MONTHS[month - 1] ?? item.dueDate.slice(0, 7)}/${item.dueDate.slice(0, 4)}`;
}

function PlanSummary({ plan, amount }: { plan: Plan; amount: number }) {
  return (
    <div className="barter-plan">
      {plan.items.length ? (
        <>
          <p>
            Abate <strong>{plan.items.length} mensalidade(s)</strong> ({brl(plan.coveredAmount)}):
          </p>
          <ul>
            {plan.items.map((item) => (
              <li key={item.transactionId}>
                {item.memberName} · {monthOf(item)} · {brl(item.amount)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">Nenhuma mensalidade abatida.</p>
      )}
      {plan.donationAmount > 0 ? (
        <p>
          <strong>{brl(plan.donationAmount)}</strong> entram como doação ao grupo
          {plan.nextOpen
            ? ` (não fecham ${plan.nextOpen.memberName} · ${monthOf(plan.nextOpen)}, que custa ${brl(plan.nextOpen.amount)})`
            : plan.memberIds.length
              ? " (não há mais mensalidades em aberto)"
              : " (quem prestou o serviço não tem filho no grupo)"}
          .
        </p>
      ) : null}
      <p className="muted">Despesa do serviço: {brl(amount)}. Entradas e saída se anulam; nada passa pelo banco.</p>
    </div>
  );
}

const EMPTY_FORM = {
  memberId: "",
  donorName: "",
  service: "",
  amount: "",
  serviceDate: todayISO(),
  expenseTypeId: "",
  donationTypeId: "",
  notes: "",
};

function defaultTypeId(types: MovementType[], hint: RegExp) {
  return (types.find((item) => hint.test(item.name)) ?? types.find((item) => /^outros$/i.test(item.name)))?.id ?? "";
}

export default function BarterPage() {
  const toast = useToast();
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);
  const list = useFetch<BarterView[]>("/permutas");
  const members = useFetch<MemberWithGuardians[]>("/members");
  const types = useFetch<MovementType[]>("/movement-types");
  const [tab, setTab] = useState<Tab>("pending");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState<Plan | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<{ item: BarterView; mode: "approve" | "reject" } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => list.data ?? [], [list.data]);
  const current = TABS.find((item) => item.id === tab)!;
  const count = (id: Tab) => all.filter((item) => TABS.find((t) => t.id === id)!.statuses.includes(item.status)).length;
  const rows = useMemo(
    () =>
      all.filter(
        (item) =>
          current.statuses.includes(item.status) &&
          matchesQuery(query, [item.donorName, item.service, item.memberName ?? ""]),
      ),
    [all, current, query],
  );

  const youths = useMemo(
    () =>
      (members.data ?? [])
        .filter((item) => item.role === "jovem" && item.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [members.data],
  );
  const expenseTypes = useMemo(
    () => (types.data ?? []).filter((item) => item.active && item.direction !== "income"),
    [types.data],
  );
  const incomeTypes = useMemo(
    () => (types.data ?? []).filter((item) => item.active && item.direction !== "expense"),
    [types.data],
  );
  const amount = parseMoney(form.amount);

  useEffect(() => {
    if (!creating || !(amount > 0) || !form.serviceDate) {
      setPreview(null);
      return;
    }
    const timer = window.setTimeout(() => {
      api<Plan>("/permutas/previa", {
        method: "POST",
        body: JSON.stringify({ memberId: form.memberId || undefined, amount, serviceDate: form.serviceDate }),
      })
        .then((plan) => {
          setPreview(plan);
          setPreviewError(null);
        })
        .catch((err: unknown) => {
          setPreview(null);
          setPreviewError(err instanceof Error ? err.message : "Não foi possível calcular a prévia");
        });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [creating, amount, form.memberId, form.serviceDate]);

  function openCreate() {
    setForm({
      ...EMPTY_FORM,
      serviceDate: todayISO(),
      expenseTypeId: defaultTypeId(expenseTypes, /permuta|servi[cç]o|manuten/i),
      donationTypeId: defaultTypeId(incomeTypes, /doa[cç][aã]o/i),
    });
    setPreview(null);
    setPreviewError(null);
    setCreating(true);
  }

  function pickMember(memberId: string) {
    const picked = youths.find((item) => item.id === memberId);
    const guardian = picked?.guardians?.[0]?.name ?? "";
    setForm((current) => ({
      ...current,
      memberId,
      donorName: current.donorName && memberId ? current.donorName : guardian,
    }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!(amount > 0)) return;
    setBusy(true);
    try {
      await api("/permutas", {
        method: "POST",
        body: JSON.stringify({
          memberId: form.memberId || undefined,
          donorName: form.donorName.trim(),
          service: form.service.trim(),
          amount,
          serviceDate: form.serviceDate,
          expenseTypeId: form.expenseTypeId,
          donationTypeId: form.donationTypeId,
          notes: form.notes.trim() || undefined,
        }),
      });
      toast.success("Permuta registrada. Nada muda no caixa até a diretoria aprovar.");
      setCreating(false);
      setTab("pending");
      void list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a permuta");
    } finally {
      setBusy(false);
    }
  }

  async function decide() {
    if (!deciding) return;
    const { item, mode } = deciding;
    setBusy(true);
    try {
      await api(`/permutas/${item.id}/${mode === "approve" ? "aprovar" : "recusar"}`, {
        method: "POST",
        body: JSON.stringify({ note: decisionNote.trim() || undefined }),
      });
      toast.success(
        mode === "approve" ? "Permuta aprovada e lançada no caixa." : "Permuta recusada. Nada mudou no caixa.",
      );
      setDeciding(null);
      setDecisionNote("");
      void list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a decisão");
    } finally {
      setBusy(false);
    }
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando permutas…" />;
  }

  return (
    <FetchOverlay active={list.loading} label="Atualizando…">
      <div>
        <PageHeader
          kicker="Mensalidades"
          title="Permutas"
          subtitle="Serviço prestado ao grupo no lugar da mensalidade. Abate só meses inteiros, do mais antigo em aberto, no valor pontual com os descontos de sempre; o que sobrar vira doação. Só entra no caixa depois da aprovação da diretoria."
          actions={
            <div className="page-head__actions">
              <button className="btn btn-primary" type="button" onClick={openCreate}>
                <FaPlus /> Registrar permuta
              </button>
            </div>
          }
        />

        <div className="grid-stats">
          <StatCard
            title="Aguardando a diretoria"
            value={String(count("pending"))}
            hint={isAdmin ? "Confira e aprove ou recuse" : "Um admin precisa aprovar"}
            tone={count("pending") ? "neg" : ""}
          />
          <StatCard
            title="Aprovadas"
            value={String(count("approved"))}
            hint={brl(all.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount, 0))}
          />
        </div>

        <div className="tabs">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={`tab ${tab === item.id ? "is-on" : ""}`}
              type="button"
              onClick={() => setTab(item.id)}
            >
              {item.label} ({count(item.id)})
            </button>
          ))}
        </div>

        <FilterBar>
          <label className="field">
            <span>Buscar</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Quem prestou, serviço, jovem…"
            />
          </label>
        </FilterBar>

        <article className="card" style={{ marginTop: "1rem" }}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Valor</th>
                  <th>Abatimento</th>
                  <th>Situação</th>
                  <th className="cell-actions">Ações</th>
                </tr>
              </thead>
              <AnimatedTableBody emptyColSpan={5} emptyMessage={current.empty}>
                {rows.map((item, index) => {
                  const status = STATUS[item.status];
                  const covered = item.status === "approved" ? item.settled : (item.plan?.items ?? []);
                  const donation = item.status === "approved" ? item.donationAmount : item.plan?.donationAmount;
                  return (
                    <AnimatedRow key={item.id} index={index}>
                      <td>
                        <strong>{item.service}</strong>
                        <div className="muted">
                          {item.donorName}
                          {item.memberName ? ` · família de ${item.memberName}` : " · sem filho no grupo"} ·{" "}
                          {formatDate(item.serviceDate)}
                        </div>
                      </td>
                      <td>
                        <strong>{brl(item.amount)}</strong>
                        <div className="muted">{item.expenseTypeName}</div>
                      </td>
                      <td>
                        {item.planError ? <div className="error">{item.planError}</div> : null}
                        {item.status === "rejected" ? (
                          <span className="muted">—</span>
                        ) : (
                          <>
                            <div>
                              {covered.length
                                ? covered.map((part) => `${part.memberName} ${monthOf(part)}`).join(", ")
                                : "Nenhuma mensalidade"}
                            </div>
                            {donation ? (
                              <div className="muted">
                                Doação: {brl(donation)} ({item.donationTypeName})
                              </div>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td>
                        <Badge kind={status.badge}>{status.label}</Badge>
                        <div className="muted">
                          {item.decidedAt
                            ? `${item.decidedByName ?? "Diretoria"} · ${formatDateTime(item.decidedAt)}`
                            : `Registrada por ${item.createdByName ?? "—"} · ${formatDateTime(item.createdAt)}`}
                        </div>
                        {item.decisionNote ? <div className="muted">{item.decisionNote}</div> : null}
                      </td>
                      <td className="cell-actions">
                        {isAdmin && item.status === "pending" ? (
                          <div className="proof-row-actions">
                            <button
                              className="btn btn-primary btn-sm"
                              type="button"
                              disabled={Boolean(item.planError)}
                              onClick={() => {
                                setDecisionNote("");
                                setDeciding({ item, mode: "approve" });
                              }}
                            >
                              Aprovar
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              type="button"
                              onClick={() => {
                                setDecisionNote("");
                                setDeciding({ item, mode: "reject" });
                              }}
                            >
                              Recusar
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </AnimatedRow>
                  );
                })}
              </AnimatedTableBody>
            </table>
          </div>
        </article>

        <AnimatePresence>
          {creating ? (
            <Modal title="Registrar permuta" onClose={() => setCreating(false)}>
              <form className="form-grid" onSubmit={(e) => void create(e)}>
                <label className="field wide">
                  <span>Jovem da família (opcional)</span>
                  <SearchableSelect
                    value={form.memberId}
                    placeholder="Sem filho no grupo: tudo vira doação"
                    onChange={pickMember}
                    options={[
                      { value: "", label: "Sem filho no grupo" },
                      ...youths.map((item) => ({ value: item.id, label: item.name })),
                    ]}
                  />
                  <small className="muted">Os irmãos cadastrados entram junto no abatimento.</small>
                </label>
                <label className="field">
                  <span>Quem prestou o serviço</span>
                  <input
                    required
                    minLength={2}
                    value={form.donorName}
                    onChange={(e) => setForm({ ...form, donorName: e.target.value })}
                    placeholder="Nome do responsável"
                  />
                </label>
                <label className="field">
                  <span>Data do serviço</span>
                  <input
                    required
                    type="date"
                    value={form.serviceDate}
                    onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
                  />
                </label>
                <label className="field wide">
                  <span>Serviço</span>
                  <input
                    required
                    minLength={3}
                    value={form.service}
                    onChange={(e) => setForm({ ...form, service: e.target.value })}
                    placeholder="Ex.: conserto do telhado da sede"
                  />
                </label>
                <label className="field">
                  <span>Valor do serviço</span>
                  <input
                    required
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: maskMoney(e.target.value) })}
                    placeholder="0,00"
                  />
                </label>
                <label className="field">
                  <span>Tipo da despesa do serviço</span>
                  <SearchableSelect
                    required
                    value={form.expenseTypeId}
                    placeholder="Selecione"
                    onChange={(value) => setForm({ ...form, expenseTypeId: value })}
                    options={expenseTypes.map((item) => ({ value: item.id, label: item.name }))}
                  />
                </label>
                <label className="field">
                  <span>Tipo da doação (sobra)</span>
                  <SearchableSelect
                    required
                    value={form.donationTypeId}
                    placeholder="Selecione"
                    onChange={(value) => setForm({ ...form, donationTypeId: value })}
                    options={incomeTypes.map((item) => ({ value: item.id, label: item.name }))}
                  />
                </label>
                <label className="field wide">
                  <span>Observações (opcional)</span>
                  <input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Orçamento, nota, combinado com a diretoria…"
                  />
                </label>
                <div className="field wide">
                  {previewError ? <p className="error">{previewError}</p> : null}
                  {preview ? (
                    <PlanSummary plan={preview} amount={amount} />
                  ) : (
                    <p className="muted">Informe o valor para ver o que será abatido.</p>
                  )}
                </div>
                <div className="modal-actions wide">
                  <button className="btn btn-ghost" type="button" onClick={() => setCreating(false)}>
                    Cancelar
                  </button>
                  <SubmitButton
                    busy={busy}
                    busyLabel="Registrando…"
                    disabled={!form.expenseTypeId || !form.donationTypeId || !(amount > 0)}
                  >
                    Registrar para aprovação
                  </SubmitButton>
                </div>
              </form>
            </Modal>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {deciding ? (
            <Modal
              title={deciding.mode === "approve" ? "Aprovar permuta" : "Recusar permuta"}
              onClose={() => setDeciding(null)}
            >
              <p>
                <strong>{deciding.item.service}</strong> · {deciding.item.donorName} · {brl(deciding.item.amount)}
              </p>
              {deciding.mode === "approve" && deciding.item.plan ? (
                <PlanSummary plan={deciding.item.plan} amount={deciding.item.amount} />
              ) : null}
              {deciding.mode === "approve" ? (
                <p className="muted">
                  Ao aprovar, as mensalidades acima são baixadas com meio Permuta em{" "}
                  {formatDate(deciding.item.serviceDate)}, a sobra entra como doação e o serviço como despesa. Não é
                  enviado recibo para a família.
                </p>
              ) : null}
              <label className="field">
                <span>{deciding.mode === "approve" ? "Observação (opcional)" : "Motivo da recusa"}</span>
                <input
                  required={deciding.mode === "reject"}
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder={
                    deciding.mode === "approve" ? "Ex.: aprovado na reunião de 10/11" : "Ex.: valor acima do orçamento"
                  }
                />
              </label>
              <div className="modal-actions">
                <button className="btn btn-ghost" type="button" onClick={() => setDeciding(null)}>
                  Cancelar
                </button>
                <SubmitButton
                  type="button"
                  busy={busy}
                  disabled={deciding.mode === "reject" && decisionNote.trim().length < 3}
                  onClick={() => void decide()}
                >
                  {deciding.mode === "approve" ? "Aprovar e lançar" : "Recusar"}
                </SubmitButton>
              </div>
            </Modal>
          ) : null}
        </AnimatePresence>
      </div>
    </FetchOverlay>
  );
}
