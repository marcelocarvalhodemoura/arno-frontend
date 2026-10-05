import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FaPaperclip, FaRedo } from "react-icons/fa";
import type { Member } from "@/domain";
import { api } from "@/core/http";
import { comprovantesGuide, PageGuide } from "@/features/help";
import NotaViewer, { type NotaMeta } from "@/features/cash-flow/NotaViewer";
import ReviewProofModal from "@/features/comprovantes/ReviewProofModal";
import { displayPhone, KIND_LABEL, STATUS_LABEL, type Proof, type ProofStatus } from "@/features/comprovantes/types";
import { useFetch } from "@/shared/hooks/use-fetch";
import { useToast } from "@/shared/feedback/toast";
import { brl, formatDate, formatDateTime } from "@/shared/lib/format";
import { matchesQuery } from "@/shared/lib/listing";
import { AnimatedRow, AnimatedTableBody } from "@/shared/ui/AnimatedTable";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import FilterBar from "@/shared/ui/FilterBar";
import Modal from "@/shared/ui/Modal";
import PageHeader from "@/shared/ui/PageHeader";
import PageLoader from "@/shared/ui/PageLoader";
import StatCard, { Badge } from "@/shared/ui/StatCard";
import SubmitButton from "@/shared/ui/SubmitButton";

type Tab = "review" | "waiting" | "done" | "discarded";

const TABS: { id: Tab; label: string; statuses: ProofStatus[]; empty: string }[] = [
  { id: "review", label: "Para conferir", statuses: ["review"], empty: "Nada para conferir. 🎉" },
  {
    id: "waiting",
    label: "Aguardando extrato",
    statuses: ["waiting"],
    empty: "Nenhum comprovante esperando o crédito no banco.",
  },
  { id: "done", label: "Conciliados", statuses: ["matched", "already"], empty: "Nenhum comprovante conciliado ainda." },
  {
    id: "discarded",
    label: "Descartados",
    statuses: ["rejected", "discarded"],
    empty: "Nenhum comprovante descartado.",
  },
];

export default function ComprovantesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("review");
  const [query, setQuery] = useState("");
  const [reviewing, setReviewing] = useState<Proof | null>(null);
  const [viewing, setViewing] = useState<Proof | null>(null);
  const [discarding, setDiscarding] = useState<Proof | null>(null);
  const [discardReason, setDiscardReason] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useFetch<Proof[]>("/comprovantes");
  const members = useFetch<Member[]>("/members");

  const all = useMemo(() => list.data ?? [], [list.data]);
  const current = TABS.find((item) => item.id === tab)!;
  const count = (id: Tab) => all.filter((item) => TABS.find((t) => t.id === id)!.statuses.includes(item.status)).length;

  const rows = useMemo(
    () =>
      all.filter(
        (item) =>
          current.statuses.includes(item.status) &&
          matchesQuery(query, [
            item.senderName,
            item.phone,
            item.payerName,
            item.bank,
            ...item.members.map((member) => member.name),
          ]),
      ),
    [all, current, query],
  );

  async function retry() {
    setBusy(true);
    try {
      const result = await api<{ checked: number; settled: number }>("/comprovantes/reprocessar", { method: "POST" });
      toast.success(
        result.settled
          ? `${result.settled} comprovante(s) conciliado(s) com o extrato.`
          : "Nenhum crédito novo no extrato para os comprovantes aguardando.",
      );
      void list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível conciliar");
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    if (!discarding) return;
    setBusy(true);
    try {
      await api(`/comprovantes/${discarding.id}/descartar`, {
        method: "POST",
        body: JSON.stringify({ reason: discardReason.trim() || undefined }),
      });
      toast.success("Comprovante descartado.");
      setDiscarding(null);
      setDiscardReason("");
      void list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível descartar");
    } finally {
      setBusy(false);
    }
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando comprovantes…" />;
  }

  return (
    <FetchOverlay active={list.loading} label="Atualizando…">
      <div>
        <PageHeader
          kicker="Mensalidades"
          title="Comprovantes recebidos"
          subtitle="Comprovantes enviados pelas famílias no WhatsApp. Os que batem com o extrato pelo ID do Pix são baixados sozinhos; os demais esperam a conferência da tesouraria."
          actions={
            <div className="page-head__actions">
              <button className="btn btn-outline" type="button" disabled={busy} onClick={() => void retry()}>
                <FaRedo /> Conciliar com o extrato
              </button>
              <PageGuide guide={comprovantesGuide} />
            </div>
          }
        />

        <div className="grid-stats">
          <StatCard
            title="Para conferir"
            value={String(count("review"))}
            hint="Sem ID do Pix, telefone sem cadastro ou valor diferente"
            tone={count("review") ? "neg" : ""}
          />
          <StatCard
            title="Aguardando extrato"
            value={String(count("waiting"))}
            hint="O Pix ainda não apareceu na sincronização do banco"
          />
          <StatCard title="Conciliados" value={String(count("done"))} hint="Baixados pelo sistema ou pela tesouraria" />
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
              placeholder="Associado, quem enviou, pagador…"
            />
          </label>
        </FilterBar>

        <article className="card" style={{ marginTop: "1rem" }}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Recebido</th>
                  <th>Enviado por</th>
                  <th>Pagamento</th>
                  <th>Situação</th>
                  <th className="cell-actions">Ações</th>
                </tr>
              </thead>
              <AnimatedTableBody emptyColSpan={5} emptyMessage={current.empty}>
                {rows.map((item, index) => {
                  const status = STATUS_LABEL[item.status];
                  const open = item.status === "review" || item.status === "waiting";
                  return (
                    <AnimatedRow key={item.id} index={index}>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>
                        <strong>{item.members.map((member) => member.name).join(", ") || "Sem cadastro"}</strong>
                        <div className="muted">
                          {item.senderName ? `${item.senderName} · ` : ""}
                          {displayPhone(item.phone)}
                        </div>
                      </td>
                      <td>
                        <strong>{item.amount ? brl(item.amount) : "Valor não lido"}</strong>
                        <div className="muted">
                          {[
                            KIND_LABEL[item.kind] ?? item.kind,
                            item.date ? formatDate(item.date) : "",
                            item.bank,
                            item.payerName,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </td>
                      <td>
                        <Badge kind={status.badge}>{status.label}</Badge>
                        {item.reason ? <div className="muted proof-reason">{item.reason}</div> : null}
                      </td>
                      <td className="cell-actions">
                        <div className="proof-row-actions">
                          {item.fileKey ? (
                            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setViewing(item)}>
                              <FaPaperclip /> Arquivo
                            </button>
                          ) : null}
                          {open ? (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                type="button"
                                onClick={() => setReviewing(item)}
                              >
                                Conferir
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                onClick={() => setDiscarding(item)}
                              >
                                Descartar
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </AnimatedRow>
                  );
                })}
              </AnimatedTableBody>
            </table>
          </div>
        </article>

        <AnimatePresence>
          {reviewing ? (
            <ReviewProofModal
              proof={reviewing}
              members={members.data ?? []}
              onClose={() => setReviewing(null)}
              onDone={(message) => {
                setReviewing(null);
                toast.success(message);
                void list.reload();
              }}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {viewing ? (
            <NotaViewer
              transactionId={viewing.id}
              fileName={viewing.fileName}
              load={() => api<NotaMeta>(`/comprovantes/${viewing.id}/arquivo`)}
              onClose={() => setViewing(null)}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {discarding ? (
            <Modal title="Descartar comprovante" onClose={() => setDiscarding(null)}>
              <p className="muted">
                {discarding.amount ? brl(discarding.amount) : "Valor não lido"} ·{" "}
                {discarding.members.map((member) => member.name).join(", ") || displayPhone(discarding.phone)}. Nada
                muda no caixa; o comprovante só sai da fila.
              </p>
              <label className="field">
                <span>Motivo (opcional)</span>
                <input
                  value={discardReason}
                  onChange={(e) => setDiscardReason(e.target.value)}
                  placeholder="Duplicado, não é pagamento, conta errada…"
                />
              </label>
              <div className="modal-actions proof-actions">
                <button className="btn btn-ghost" type="button" onClick={() => setDiscarding(null)}>
                  Cancelar
                </button>
                <SubmitButton type="button" busy={busy} onClick={() => void discard()}>
                  Descartar
                </SubmitButton>
              </div>
            </Modal>
          ) : null}
        </AnimatePresence>
      </div>
    </FetchOverlay>
  );
}
