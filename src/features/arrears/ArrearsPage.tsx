import { useMemo, useState, type FormEvent } from "react";
import type {
  ArrearsChargeMode,
  ArrearsPayment,
  ArrearsPaymentSource,
  Member,
  MemberArrears,
  PaymentMethod,
} from "@/domain";
import PageHeader from "@/shared/ui/PageHeader";
import { PageGuide, arrearsGuide } from "@/features/help";
import Modal from "@/shared/ui/Modal";
import PageLoader from "@/shared/ui/PageLoader";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import ListingResults from "@/shared/ui/ListingResults";
import SubmitButton from "@/shared/ui/SubmitButton";
import FilterBar from "@/shared/ui/FilterBar";
import Pager from "@/shared/ui/Pager";
import IconButton from "@/shared/ui/IconButton";
import SearchableSelect from "@/shared/ui/SearchableSelect";
import { AnimatePresence } from "framer-motion";
import { FaBan, FaCalendarPlus, FaCheck, FaEye, FaMoneyBillWave } from "react-icons/fa";
import { api } from "@/core/http";
import { useToast } from "@/shared/feedback/toast";
import { brl } from "@/shared/lib/format";
import { matchesQuery, usePagedList } from "@/shared/lib/listing";
import { formatMoney, maskMoney, parseMoney } from "@/shared/lib/masks";
import { formClass, submitAttempt } from "@/shared/lib/form";
import { useFetch } from "@/shared/hooks/use-fetch";
import { useFlashId } from "@/shared/hooks/use-flash-id";
import { AnimatedRow, AnimatedTableBody } from "@/shared/ui/AnimatedTable";

const emptyForm = {
  memberId: "",
  amount: "",
  installments: "6",
  startYearMonth: `${new Date().getFullYear()}-03`,
  chargeMode: "embed" as ArrearsChargeMode,
  note: "",
};

type ArrearsDetail = {
  plan: MemberArrears;
  progress: {
    originalAmount: number;
    paidTotal: number;
    balance: number;
    percentPaid: number;
    installmentsPaid: number;
    installmentsRemaining: number;
    installmentAmount: number;
  };
  payments: ArrearsPayment[];
};

function statusLabel(status: MemberArrears["status"]) {
  if (status === "active") return "Ativo";
  if (status === "settled") return "Quitado";
  return "Cancelado";
}

function modeLabel(mode: ArrearsChargeMode) {
  return mode === "embed" ? "Embutido na mensalidade" : "Lançamento à parte";
}

function sourceLabel(source: ArrearsPaymentSource) {
  if (source === "mensalidade") return "Com mensalidade";
  if (source === "separate") return "Parcela à parte";
  return "Pagamento avulso";
}

function methodLabel(method: PaymentMethod) {
  if (method === "pix") return "Pix";
  if (method === "cash") return "Dinheiro";
  if (method === "transfer") return "Transferência";
  if (method === "card") return "Cartão";
  return "Outro";
}

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function paidTotalOf(plan: MemberArrears) {
  const logged = (plan.payments ?? []).reduce((sum, item) => sum + item.amount, 0);
  if (logged > 0) return Math.min(logged, plan.originalAmount);
  return Math.max(0, plan.originalAmount - plan.balance);
}

function percentPaidOf(plan: MemberArrears) {
  if (!(plan.originalAmount > 0)) return 100;
  return Math.min(100, Math.round((paidTotalOf(plan) / plan.originalAmount) * 1000) / 10);
}

export default function ArrearsPage() {
  const toast = useToast();
  const list = useFetch<MemberArrears[]>("/arrears");
  const members = useFetch<Member[]>("/members");
  const [flashId, flash] = useFlashId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MemberArrears["status"]>("active");
  const [attempted, setAttempted] = useState(false);

  const [payPlan, setPayPlan] = useState<MemberArrears | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payAt, setPayAt] = useState(todayISO());
  const [payMethod, setPayMethod] = useState<PaymentMethod>("pix");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [payAttempted, setPayAttempted] = useState(false);
  const [paying, setPaying] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ArrearsDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members.data ?? []) map.set(member.id, member.name);
    return map;
  }, [members.data]);

  const plans = list.data ?? [];
  const filtered = useMemo(() => {
    return plans.filter((plan) => {
      if (statusFilter !== "all" && plan.status !== statusFilter) return false;
      const name = memberName.get(plan.memberId) ?? "";
      return matchesQuery(query, [name, plan.note, plan.startYearMonth, modeLabel(plan.chargeMode)]);
    });
  }, [plans, statusFilter, query, memberName]);
  const listing = usePagedList(filtered, `${query}|${statusFilter}`);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
    setForm(emptyForm);
    setError(null);
    setAttempted(false);
  }

  function openPay(plan: MemberArrears, preset?: "installment" | "full") {
    const amount = preset === "full" ? plan.balance : Math.min(plan.installmentAmount, plan.balance);
    setPayPlan(plan);
    setPayAmount(formatMoney(amount));
    setPayAt(todayISO());
    setPayMethod("pix");
    setPayNote("");
    setPayError(null);
    setPayAttempted(false);
  }

  function closePay() {
    setPayPlan(null);
    setPayError(null);
    setPayAttempted(false);
  }

  async function openDetail(plan: MemberArrears) {
    setDetailId(plan.id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await api<ArrearsDetail>(`/arrears/${plan.id}`);
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Não foi possível carregar o acordo");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailId(null);
    setDetail(null);
    setDetailError(null);
  }

  async function reloadDetailIfOpen(planId: string) {
    if (detailId !== planId) return;
    try {
      const data = await api<ArrearsDetail>(`/arrears/${planId}`);
      setDetail(data);
    } catch {
      /* ignore refresh errors */
    }
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    setError(null);
    const amount = parseMoney(form.amount);
    const installments = Number(form.installments);
    if (!form.memberId || !(amount > 0) || installments < 2 || installments > 12) return;
    setSaving(true);
    try {
      const created = await api<{ id: string }>("/arrears", {
        method: "POST",
        body: JSON.stringify({
          memberId: form.memberId,
          amount,
          installments,
          startYearMonth: form.startYearMonth,
          chargeMode: form.chargeMode,
          note: form.note.trim() || undefined,
        }),
      });
      flash(created.id);
      toast.success("Acordo de dívida criado.");
      closeForm();
      await list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o acordo");
    } finally {
      setSaving(false);
    }
  }

  async function savePay(e: FormEvent<HTMLFormElement>) {
    if (!payPlan || !submitAttempt(e, setPayAttempted)) return;
    setPayError(null);
    const amount = parseMoney(payAmount);
    if (!(amount > 0)) return;
    setPaying(true);
    try {
      const result = await api<{ plan: MemberArrears }>(`/arrears/${payPlan.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          paidAt: payAt,
          method: payMethod,
          note: payNote.trim() || undefined,
        }),
      });
      toast.success(
        result.plan.status === "settled"
          ? "Pagamento registrado e acordo quitado."
          : `Pagamento de ${brl(amount)} registrado. Saldo: ${brl(result.plan.balance)}.`,
      );
      flash(payPlan.id);
      closePay();
      await list.reload();
      await reloadDetailIfOpen(payPlan.id);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Não foi possível registrar o pagamento");
    } finally {
      setPaying(false);
    }
  }

  async function cancel(plan: MemberArrears) {
    const name = memberName.get(plan.memberId) ?? "associado";
    if (!confirm(`Cancelar o acordo de ${name}? Parcelas embutidas pendentes voltam ao valor da mensalidade.`)) return;
    await api(`/arrears/${plan.id}/cancel`, { method: "PATCH", body: "{}" });
    toast.success("Acordo cancelado.");
    flash(plan.id);
    await list.reload();
    if (detailId === plan.id) closeDetail();
  }

  async function settle(plan: MemberArrears) {
    const name = memberName.get(plan.memberId) ?? "associado";
    if (
      !confirm(`Quitar o saldo restante (${brl(plan.balance)}) de ${name}? O valor será lançado no fluxo de caixa.`)
    ) {
      return;
    }
    await api(`/arrears/${plan.id}/settle`, {
      method: "PATCH",
      body: JSON.stringify({ recordPayment: true }),
    });
    toast.success("Acordo quitado e lançado no fluxo.");
    flash(plan.id);
    await list.reload();
    await reloadDetailIfOpen(plan.id);
  }

  async function generateDue(plan: MemberArrears) {
    const monthLimit = currentYearMonth();
    if (
      !confirm(
        `Gerar lançamentos pendentes até ${monthLimit} (retroativo)? Competências já existentes não são alteradas.`,
      )
    ) {
      return;
    }
    const result = await api<{ created: number }>(`/arrears/${plan.id}/generate-due`, {
      method: "POST",
      body: JSON.stringify({ monthLimit }),
    });
    toast.success(
      result.created === 0
        ? "Nenhuma parcela nova a gerar."
        : `${result.created} lançamento(s) gerado(s) no fluxo de caixa.`,
    );
    flash(plan.id);
    await list.reload();
  }

  if (!list.data || !members.data) {
    if (list.error || members.error) return <p className="error">{list.error ?? members.error}</p>;
    return <PageLoader label="Carregando dívidas…" />;
  }

  const activeMembers = members.data
    .filter((m) => m.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const detailName = detail ? (memberName.get(detail.plan.memberId) ?? "Associado") : "";

  return (
    <div>
      <PageHeader
        kicker="Movimentações"
        title="Dívidas"
        subtitle="Acordos de atrasados diluídos em parcelas: embutidos na mensalidade ou como lançamento à parte no fluxo."
        actions={
          <div className="page-head__actions">
            <PageGuide guide={arrearsGuide} />
            <button className="btn btn-primary" type="button" onClick={openCreate}>
              Novo acordo
            </button>
          </div>
        }
      />

      <FetchOverlay active={list.loading} label="Atualizando dívidas…">
        <article className="card">
          <FilterBar>
            <label className="field">
              <span>Buscar</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Associado, nota…" />
            </label>
            <label className="field">
              <span>Status</span>
              <SearchableSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                placeholder="Todos"
                options={[
                  { value: "active", label: "Ativos" },
                  { value: "settled", label: "Quitados" },
                  { value: "cancelled", label: "Cancelados" },
                  { value: "all", label: "Todos" },
                ]}
              />
            </label>
          </FilterBar>
          <ListingResults fetching={list.loading} filtering={listing.busy} fetchLabel="Atualizando dívidas…">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Associado</th>
                    <th>Modo</th>
                    <th>Início</th>
                    <th className="num">Original</th>
                    <th className="num">Pago</th>
                    <th className="num">Saldo</th>
                    <th className="num">Parcela</th>
                    <th>Progresso</th>
                    <th>Status</th>
                    <th className="cell-actions">Ações</th>
                  </tr>
                </thead>
                <AnimatedTableBody emptyColSpan={10} emptyMessage="Nenhum acordo com esses filtros.">
                  {listing.pageRows.map((plan, index) => {
                    const paid = paidTotalOf(plan);
                    const pct = percentPaidOf(plan);
                    return (
                      <AnimatedRow key={plan.id} index={index} flash={flashId === plan.id}>
                        <td>
                          <strong>{memberName.get(plan.memberId) ?? "—"}</strong>
                          {plan.note ? <div className="muted">{plan.note}</div> : null}
                          <div className="muted">
                            {plan.totalCount - plan.remainingCount}/{plan.totalCount} parcelas
                          </div>
                        </td>
                        <td>{modeLabel(plan.chargeMode)}</td>
                        <td>{plan.startYearMonth}</td>
                        <td className="num">{brl(plan.originalAmount)}</td>
                        <td className="num">{brl(paid)}</td>
                        <td className="num">{brl(plan.balance)}</td>
                        <td className="num">{brl(plan.installmentAmount)}</td>
                        <td style={{ minWidth: 120 }}>
                          <div className="muted" style={{ marginBottom: 4 }}>
                            {pct}%
                          </div>
                          <div className="progress-bar">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td>{statusLabel(plan.status)}</td>
                        <td className="cell-actions">
                          <IconButton label="Ver controle de pagamento" onClick={() => void openDetail(plan)}>
                            <FaEye />
                          </IconButton>
                          {plan.status === "active" ? (
                            <>
                              <IconButton label="Registrar pagamento" onClick={() => openPay(plan, "installment")}>
                                <FaMoneyBillWave />
                              </IconButton>
                              {plan.chargeMode === "separate" ? (
                                <IconButton label="Gerar parcelas vencidas" onClick={() => void generateDue(plan)}>
                                  <FaCalendarPlus />
                                </IconButton>
                              ) : null}
                              <IconButton label="Quitar acordo" onClick={() => void settle(plan)}>
                                <FaCheck />
                              </IconButton>
                              <IconButton label="Cancelar acordo" tone="danger" onClick={() => void cancel(plan)}>
                                <FaBan />
                              </IconButton>
                            </>
                          ) : null}
                        </td>
                      </AnimatedRow>
                    );
                  })}
                </AnimatedTableBody>
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
          <Modal title="Novo acordo de dívida" onClose={closeForm}>
            <form onSubmit={save} className={formClass("form-grid", attempted)} noValidate>
              {error ? <div className="error wide">{error}</div> : null}
              <label className="field wide">
                <span>Associado</span>
                <SearchableSelect
                  required
                  value={form.memberId}
                  placeholder="Selecione…"
                  searchPlaceholder="Buscar associado…"
                  onChange={(memberId) => setForm({ ...form, memberId })}
                  options={[
                    { value: "", label: "Selecione…" },
                    ...activeMembers.map((member) => ({ value: member.id, label: member.name })),
                  ]}
                />
              </label>
              <label className="field">
                <span>Valor da dívida</span>
                <input
                  required
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: maskMoney(e.target.value) })}
                  placeholder="0,00"
                />
              </label>
              <label className="field">
                <span>Parcelas (2–12)</span>
                <input
                  required
                  type="number"
                  min={2}
                  max={12}
                  value={form.installments}
                  onChange={(e) => setForm({ ...form, installments: e.target.value })}
                />
              </label>
              <label className="field">
                <span>1ª competência</span>
                <input
                  required
                  type="month"
                  value={form.startYearMonth}
                  onChange={(e) => setForm({ ...form, startYearMonth: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Modo de cobrança</span>
                <SearchableSelect
                  value={form.chargeMode}
                  placeholder="Selecione"
                  onChange={(value) => setForm({ ...form, chargeMode: value as ArrearsChargeMode })}
                  options={[
                    { value: "embed", label: "Embutir na mensalidade" },
                    { value: "separate", label: "Lançamento à parte" },
                  ]}
                />
              </label>
              <label className="field wide">
                <span>Nota (opcional)</span>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Ex.: atraso 2024 diluído em 2026"
                />
              </label>
              <p className="muted wide">
                {form.chargeMode === "embed"
                  ? "A parcela entra no valor da mensalidade (mar–nov). Ao baixar a mensalidade, a parcela do acordo é dada como paga. Também é possível registrar pagamento avulso."
                  : "Gera lançamentos no fluxo (tipo Acordo / dívida diluída). Use “Gerar parcelas vencidas” para o retroativo ou registre pagamento avulso."}
              </p>
              <div className="form-actions wide">
                <button type="button" className="btn" onClick={closeForm}>
                  Cancelar
                </button>
                <SubmitButton busy={saving}>Criar acordo</SubmitButton>
              </div>
            </form>
          </Modal>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {payPlan ? (
          <Modal title="Registrar pagamento do acordo" onClose={closePay}>
            <form onSubmit={savePay} className={formClass("form-grid", payAttempted)} noValidate>
              {payError ? <div className="error wide">{payError}</div> : null}
              <p className="muted wide">
                {memberName.get(payPlan.memberId) ?? "Associado"} · saldo <strong>{brl(payPlan.balance)}</strong> ·
                parcela {brl(payPlan.installmentAmount)}
              </p>
              <label className="field">
                <span>Valor</span>
                <input
                  required
                  inputMode="decimal"
                  value={payAmount}
                  onChange={(e) => setPayAmount(maskMoney(e.target.value))}
                  placeholder="0,00"
                />
              </label>
              <label className="field">
                <span>Data</span>
                <input required type="date" value={payAt} onChange={(e) => setPayAt(e.target.value)} />
              </label>
              <label className="field">
                <span>Forma</span>
                <SearchableSelect
                  value={payMethod}
                  placeholder="Selecione"
                  onChange={(value) => setPayMethod(value as PaymentMethod)}
                  options={[
                    { value: "pix", label: "Pix" },
                    { value: "cash", label: "Dinheiro" },
                    { value: "transfer", label: "Transferência" },
                    { value: "card", label: "Cartão" },
                    { value: "other", label: "Outro" },
                  ]}
                />
              </label>
              <label className="field wide">
                <span>Nota (opcional)</span>
                <input
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Ex.: adiantamento de 2 parcelas"
                />
              </label>
              <div className="form-actions wide" style={{ gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn" onClick={() => openPay(payPlan, "installment")}>
                  1 parcela
                </button>
                <button type="button" className="btn" onClick={() => openPay(payPlan, "full")}>
                  Quitar saldo
                </button>
                <button type="button" className="btn" onClick={closePay}>
                  Cancelar
                </button>
                <SubmitButton busy={paying}>Registrar</SubmitButton>
              </div>
            </form>
          </Modal>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {detailId ? (
          <Modal title={`Controle — ${detailName}`} onClose={closeDetail}>
            {detailLoading ? <PageLoader label="Carregando controle…" /> : null}
            {detailError ? <p className="error">{detailError}</p> : null}
            {detail ? (
              <div style={{ display: "grid", gap: 16 }}>
                <div className="card" style={{ boxShadow: "none", border: "1px solid var(--line)" }}>
                  <div className="form-grid">
                    <div>
                      <div className="muted">Original</div>
                      <strong>{brl(detail.progress.originalAmount)}</strong>
                    </div>
                    <div>
                      <div className="muted">Já pago</div>
                      <strong>{brl(detail.progress.paidTotal)}</strong>
                    </div>
                    <div>
                      <div className="muted">Saldo a quitar</div>
                      <strong>{brl(detail.progress.balance)}</strong>
                    </div>
                    <div>
                      <div className="muted">Parcelas</div>
                      <strong>
                        {detail.progress.installmentsPaid}/{detail.plan.totalCount}
                      </strong>
                      <div className="muted">
                        restam {detail.progress.installmentsRemaining} · {brl(detail.progress.installmentAmount)}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div className="muted" style={{ marginBottom: 4 }}>
                      {detail.progress.percentPaid}% quitado · {modeLabel(detail.plan.chargeMode)} ·{" "}
                      {statusLabel(detail.plan.status)}
                    </div>
                    <div className="progress-bar">
                      <span style={{ width: `${detail.progress.percentPaid}%` }} />
                    </div>
                  </div>
                  {detail.plan.status === "active" ? (
                    <div className="form-actions" style={{ marginTop: 16 }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => openPay(detail.plan, "installment")}
                      >
                        Registrar pagamento
                      </button>
                      <button type="button" className="btn" onClick={() => void settle(detail.plan)}>
                        Quitar saldo
                      </button>
                    </div>
                  ) : null}
                </div>

                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>Histórico de pagamentos</h3>
                  <div className="table-wrap">
                    <table className="data">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Origem</th>
                          <th>Forma</th>
                          <th>Competência</th>
                          <th className="num">Valor</th>
                          <th>Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.payments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="muted">
                              Nenhum pagamento registrado ainda.
                            </td>
                          </tr>
                        ) : (
                          detail.payments.map((payment) => (
                            <tr key={payment.id}>
                              <td>{payment.paidAt}</td>
                              <td>{sourceLabel(payment.source)}</td>
                              <td>{methodLabel(payment.method)}</td>
                              <td>{payment.yearMonth ?? "—"}</td>
                              <td className="num">{brl(payment.amount)}</td>
                              <td className="muted">{payment.note ?? "—"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </Modal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
