import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BRANCH_LABELS,
  YOUTH_BRANCHES,
  type MensalidadeCell,
  type MensalidadeReport,
  type MensalidadeRow,
  type MemberRole,
  type MemberStatus,
  type YouthBranchId,
} from "@/domain";
import PageHeader from "@/shared/ui/PageHeader";
import StatCard, { Badge } from "@/shared/ui/StatCard";
import PageLoader from "@/shared/ui/PageLoader";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import ListingResults from "@/shared/ui/ListingResults";
import FilterBar from "@/shared/ui/FilterBar";
import Pager from "@/shared/ui/Pager";
import Modal from "@/shared/ui/Modal";
import SubmitButton from "@/shared/ui/SubmitButton";
import { AnimatePresence } from "framer-motion";
import { brl, formatDate, MONTHS, roleLabel, settlementLabel, todayISO } from "@/shared/lib/format";
import { matchesQuery, usePagedList } from "@/shared/lib/listing";
import { usePeriod } from "@/shared/lib/period";
import { useFetch } from "@/shared/hooks/use-fetch";
import { api } from "@/core/http";
import { useToast } from "@/shared/feedback/toast";

const SHORT_MONTHS = ["Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const SCOUT_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function Mensalidades() {
  const navigate = useNavigate();
  const toast = useToast();
  const { year, month, setMonth } = usePeriod();
  const list = useFetch<MensalidadeReport>(`/mensalidades?year=${year}`);
  const channels = useFetch<{ email: boolean; whatsapp: boolean }>("/notify/status");
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState<YouthBranchId | "">("");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "">("active");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "">("");
  const [picked, setPicked] = useState<{ row: MensalidadeRow; cell: MensalidadeCell } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dueDayDraft, setDueDayDraft] = useState("");
  const today = todayISO();
  const currentMonth = Number(today.slice(5, 7));
  const currentYear = Number(today.slice(0, 4));
  const chargeMonth = SCOUT_MONTHS.includes(month) ? month : SCOUT_MONTHS.includes(currentMonth) ? currentMonth : 3;

  const rows = list.data?.rows ?? [];
  const months = list.data?.months ?? [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const dueDay = list.data?.dueDay ?? 10;

  useEffect(() => {
    if (list.data?.dueDay) setDueDayDraft(String(list.data.dueDay));
  }, [list.data?.dueDay]);
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (branch && row.branch !== branch) return false;
        if (statusFilter && row.memberStatus !== statusFilter) return false;
        if (roleFilter && row.role !== roleFilter) return false;
        return matchesQuery(query, [row.name, BRANCH_LABELS[row.branch], roleLabel(row.role), `dia ${row.dueDay}`]);
      }),
    [rows, branch, statusFilter, roleFilter, query],
  );
  const listing = usePagedList(filtered, [query, branch, statusFilter, roleFilter, year].join("|"));
  const summary = useMemo(() => {
    const totals = { paid: 0, pending: 0, overdue: 0, openAmount: 0, paidAmount: 0 };
    for (const row of filtered) {
      for (const cell of row.cells) {
        if (cell.status === "paid") {
          totals.paid += 1;
          totals.paidAmount += cell.amount;
        } else if (cell.status === "pending") {
          totals.pending += 1;
          totals.openAmount += cell.amount;
        } else if (cell.status === "overdue") {
          totals.overdue += 1;
          totals.openAmount += cell.amount;
        }
      }
    }
    return totals;
  }, [filtered]);

  function openMonth(target: number) {
    setMonth(target);
    navigate("/fluxo");
  }

  async function notify(kind: "charge" | "receipt", transactionIds?: string[], targetMonth?: number) {
    setBusy(true);
    try {
      const result = await api<{ queued: number; sent: number; failed: number; skipped: number }>(
        "/mensalidades/notify",
        {
          method: "POST",
          body: JSON.stringify({
            year,
            kind,
            month: targetMonth,
            transactionIds,
          }),
        },
      );
      const parts = [
        result.queued ? `${result.queued} na fila` : "",
        result.sent ? `${result.sent} enviado(s)` : "",
        result.skipped ? `${result.skipped} sem contato` : "",
        result.failed ? `${result.failed} falhou(aram)` : "",
      ].filter(Boolean);
      toast.success(parts.length ? `${parts.join(" · ")}.` : "Nada a disparar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível disparar");
    } finally {
      setBusy(false);
    }
  }

  async function saveDueDay() {
    const next = Number(dueDayDraft);
    if (!Number.isInteger(next) || next < 1 || next > 31) {
      toast.error("Informe um dia entre 1 e 31.");
      return;
    }
    setBusy(true);
    try {
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify({ mensalidadeDueDay: next }),
      });
      toast.success("Dia de vencimento atualizado.");
      await list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o vencimento");
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(transactionId: string) {
    setBusy(true);
    try {
      await api(`/transactions/${transactionId}`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus: "paid", notifyReceipt: true }),
      });
      toast.success("Mensalidade marcada como paga. Comprovante entra na fila se houver contato.");
      setPicked(null);
      await list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível marcar como paga");
    } finally {
      setBusy(false);
    }
  }

  async function setClubFee(transactionId: string, clubFeeIncluded: boolean) {
    setBusy(true);
    try {
      const tx = await api<{ amount: number; clubFeeIncluded?: boolean }>("/mensalidades/club-fee", {
        method: "PATCH",
        body: JSON.stringify({ transactionId, clubFeeIncluded }),
      });
      toast.success(clubFeeIncluded ? "Taxa do clube incluída neste mês." : "Taxa do clube removida neste mês.");
      setPicked((current) =>
        current && current.cell.transactionId === transactionId
          ? {
              ...current,
              cell: {
                ...current.cell,
                clubFeeIncluded,
                amount: tx.amount,
              },
            }
          : current,
      );
      await list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar a taxa do clube");
    } finally {
      setBusy(false);
    }
  }

  async function setClubFeeBulk(clubFeeIncluded: boolean) {
    const label = MONTHS[chargeMonth - 1];
    const action = clubFeeIncluded ? "incluir" : "remover";
    if (
      !confirm(
        `Confirma ${action} a taxa do clube (R$ 20, exceto pioneiros) em todas as mensalidades pendentes de ${label}/${year}?`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ updated: number }>("/mensalidades/club-fee/bulk", {
        method: "POST",
        body: JSON.stringify({ year, month: chargeMonth, clubFeeIncluded }),
      });
      toast.success(
        result.updated
          ? `${result.updated} mensalidade(s) atualizada(s) em ${label}.`
          : `Nenhuma mensalidade pendente alterada em ${label}.`,
      );
      await list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível aplicar em massa");
    } finally {
      setBusy(false);
    }
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando mensalidades…" />;
  }

  return (
    <div>
      <PageHeader
        kicker="Mensalidades"
        title={`Ano escoteiro ${year}`}
        subtitle={`Março a novembro. Mar/abr: R$ 60 (R$ 15 pioneiros). A partir de maio: cartaz atual com taxa do clube e diluição. Vencimento todo dia ${dueDay}.`}
        actions={
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="btn btn-outline"
              type="button"
              disabled={busy}
              onClick={() => void setClubFeeBulk(true)}
            >
              Incluir clube · {MONTHS[chargeMonth - 1]}
            </button>
            <button
              className="btn btn-outline"
              type="button"
              disabled={busy}
              onClick={() => void setClubFeeBulk(false)}
            >
              Remover clube · {MONTHS[chargeMonth - 1]}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={busy}
              onClick={() => void notify("charge", undefined, chargeMonth)}
            >
              Cobrar {MONTHS[chargeMonth - 1]}
            </button>
          </div>
        }
      />

      <div className="grid-stats" style={{ marginBottom: 18 }}>
        <StatCard title="Pagas" value={String(summary.paid)} hint={brl(summary.paidAmount)} tone="pos" />
        <StatCard title="Pendentes" value={String(summary.pending)} hint="Ainda no prazo" />
        <StatCard title="Vencidas" value={String(summary.overdue)} hint={`Passou o dia ${dueDay}`} tone="neg" />
        <StatCard title="Em aberto" value={brl(summary.openAmount)} hint="Pendente + vencido" />
      </div>

      <FetchOverlay active={list.loading} label="Atualizando mensalidades…">
        <article className="card">
          <FilterBar>
            <label className="field">
              <span>Buscar</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome, ramo ou dia de vencimento…"
              />
            </label>
            <label className="field">
              <span>Vence todo dia</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={dueDayDraft}
                  onChange={(e) => setDueDayDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  aria-label="Dia de vencimento da mensalidade"
                  style={{ width: 72 }}
                />
                <button
                  className="btn btn-outline"
                  type="button"
                  disabled={busy || Number(dueDayDraft) === dueDay}
                  onClick={() => void saveDueDay()}
                >
                  Aplicar
                </button>
              </span>
            </label>
            <label className="field">
              <span>Ramo</span>
              <select value={branch} onChange={(e) => setBranch(e.target.value as YouthBranchId | "")}>
                <option value="">Todos</option>
                {YOUTH_BRANCHES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Papel</span>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as MemberRole | "")}>
                <option value="">Todos</option>
                <option value="jovem">Jovem</option>
                <option value="escotista">Escotista</option>
                <option value="dirigente">Dirigente</option>
                <option value="clube">Clube da Flor de Lis</option>
              </select>
            </label>
            <label className="field">
              <span>Situação do associado</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MemberStatus | "")}>
                <option value="">Todas</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>
          </FilterBar>
          <ListingResults fetching={list.loading} filtering={listing.busy} fetchLabel="Atualizando mensalidades…">
            <div className="table-wrap">
              <table className="data fees-grid">
                <thead>
                  <tr>
                    <th className="fees-grid__name">Associado</th>
                    {months.map((month) => (
                      <th
                        key={month}
                        className={`fees-grid__month${year === currentYear && month === currentMonth ? " is-current" : ""}`}
                      >
                        <button type="button" className="fees-grid__month-btn" onClick={() => openMonth(month)}>
                          {SHORT_MONTHS[month - 3]}
                          <small>{MONTHS[month - 1]}</small>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listing.pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={1 + months.length} className="muted">
                        Nenhum associado com mensalidade nesses filtros.
                      </td>
                    </tr>
                  ) : (
                    listing.pageRows.map((row) => (
                      <tr key={row.memberId}>
                        <td className="fees-grid__name">
                          <strong>{row.name}</strong>
                          <div className="muted">
                            {BRANCH_LABELS[row.branch]} · {roleLabel(row.role)}
                            {row.clubeLtc ? " · sócio Lindóia" : ""}
                            {row.feeOverride != null ? " · valor especial" : ""} · {brl(row.monthlyFee)}
                            {row.lateFee !== row.monthlyFee ? ` · após dia ${row.dueDay} ${brl(row.lateFee)}` : ""}
                          </div>
                          <div className="muted">
                            Vence todo dia {row.dueDay} · ingresso {formatDate(row.joinedAt)}
                          </div>
                        </td>
                        {row.cells.map((cell) => (
                          <td
                            key={cell.month}
                            className={`fees-grid__month${year === currentYear && cell.month === currentMonth ? " is-current" : ""}`}
                          >
                            <FeeCell cell={cell} onOpen={() => setPicked({ row, cell })} />
                          </td>
                        ))}
                      </tr>
                    ))
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
        {picked && picked.cell.status !== "none" ? (
          <Modal title={`${picked.row.name} · ${MONTHS[picked.cell.month - 1]}`} onClose={() => setPicked(null)}>
            <p className="muted">
              {settlementLabel(picked.cell.status)} · {brl(picked.cell.amount)}
              {picked.cell.dueDate ? ` · vence ${formatDate(picked.cell.dueDate)}` : ""}
            </p>
            <p className="muted">
              Taxa do clube neste mês:{" "}
              <strong>{picked.cell.clubFeeIncluded ? "incluída" : "removida"}</strong>
              {picked.row.feeOverride != null
                ? " (valor especial: a taxa do clube não altera o total)"
                : picked.row.branch === "pioneiro"
                  ? " (pioneiro não tem parcela do clube)"
                  : " (R$ 20)"}
            </p>
            {!channels.data?.email && !channels.data?.whatsapp ? (
              <p className="muted">
                Configure MAIL_HOST no .env (ou MAIL_MOCK=1) para disparar cobrança e comprovante.
              </p>
            ) : null}
            <div className="modal-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setPicked(null)} disabled={busy}>
                Fechar
              </button>
              <button
                className="btn btn-outline"
                type="button"
                disabled={busy}
                onClick={() => openMonth(picked.cell.month)}
              >
                Ver no caixa
              </button>
              {picked.cell.status !== "paid" && picked.cell.transactionId ? (
                <button
                  className="btn btn-outline"
                  type="button"
                  disabled={busy || picked.row.branch === "pioneiro" || picked.row.feeOverride != null}
                  onClick={() =>
                    void setClubFee(picked.cell.transactionId!, !picked.cell.clubFeeIncluded)
                  }
                >
                  {picked.cell.clubFeeIncluded ? "Remover taxa do clube" : "Incluir taxa do clube"}
                </button>
              ) : null}
              {picked.cell.status === "paid" ? (
                <SubmitButton
                  type="button"
                  busy={busy}
                  busyLabel="Enfileirando…"
                  onClick={() =>
                    picked.cell.transactionId ? void notify("receipt", [picked.cell.transactionId]) : undefined
                  }
                >
                  Enviar comprovante
                </SubmitButton>
              ) : (
                <>
                  <button
                    className="btn btn-outline"
                    type="button"
                    disabled={busy || !picked.cell.transactionId}
                    onClick={() =>
                      picked.cell.transactionId
                        ? void notify("charge", [picked.cell.transactionId], picked.cell.month)
                        : undefined
                    }
                  >
                    Cobrar
                  </button>
                  <SubmitButton
                    type="button"
                    busy={busy}
                    busyLabel="Registrando…"
                    onClick={() => (picked.cell.transactionId ? void markPaid(picked.cell.transactionId) : undefined)}
                  >
                    Marcar paga
                  </SubmitButton>
                </>
              )}
            </div>
          </Modal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function FeeCell({ cell, onOpen }: { cell: MensalidadeCell; onOpen: () => void }) {
  if (cell.status === "none") {
    return <span className="muted">—</span>;
  }
  return (
    <button
      type="button"
      className={`fee-cell fee-cell--${cell.status}`}
      title={`${settlementLabel(cell.status)} · vencimento ${formatDate(cell.dueDate ?? "")}${
        cell.clubFeeIncluded ? "" : " · sem taxa do clube"
      }`}
      onClick={onOpen}
    >
      <Badge kind={cell.status}>{settlementLabel(cell.status)}</Badge>
      <small>{brl(cell.amount)}</small>
      {!cell.clubFeeIncluded ? <small className="muted">sem clube</small> : null}
    </button>
  );
}
