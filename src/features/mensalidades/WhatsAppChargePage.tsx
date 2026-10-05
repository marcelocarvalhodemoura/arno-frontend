import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FaCopy, FaWhatsapp } from "react-icons/fa";
import { PageGuide, whatsappChargeGuide } from "@/features/help";
import { api } from "@/core/http";
import { useFetch } from "@/shared/hooks/use-fetch";
import { useToast } from "@/shared/feedback/toast";
import { brl, formatDateTime, todayISO } from "@/shared/lib/format";
import { matchesQuery } from "@/shared/lib/listing";
import { AnimatedRow, AnimatedTableBody } from "@/shared/ui/AnimatedTable";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import FilterBar from "@/shared/ui/FilterBar";
import Modal from "@/shared/ui/Modal";
import PageHeader from "@/shared/ui/PageHeader";
import PageLoader from "@/shared/ui/PageLoader";
import StatCard, { Badge } from "@/shared/ui/StatCard";

type Mode = "overdue" | "upcoming";

type QueueItem = {
  transactionId: string;
  yearMonth: string;
  label: string;
  dueDate: string;
  onTimeAmount: number;
  lateAmount: number;
  amount: number;
  surcharge: number;
};

type QueueContact = { name: string; relationship: string; phone: string; link: string; text: string };

type QueueRow = {
  memberId: string;
  name: string;
  branchLabel: string;
  items: QueueItem[];
  total: number;
  surcharge: number;
  pixAmount: number;
  hasAgreement: boolean;
  contacts: QueueContact[];
  lastSentAt: string | null;
};

type Queue = {
  mode: Mode;
  dueDay: number;
  rows: QueueRow[];
  totals: { members: number; amount: number; withoutPhone: number };
};

function daysSince(iso: string) {
  return Math.floor((Date.parse(`${todayISO()}T12:00:00Z`) - Date.parse(`${iso.slice(0, 10)}T12:00:00Z`)) / 86_400_000);
}

function LastSent({ at }: { at: string | null }) {
  if (!at) return <span className="muted">—</span>;
  const days = daysSince(at);
  return (
    <span title={formatDateTime(at)}>
      <Badge kind={days < 7 ? "pending" : "waived"}>{days <= 0 ? "Hoje" : `Há ${days} dia(s)`}</Badge>
    </span>
  );
}

export default function WhatsAppChargePage() {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("overdue");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<QueueRow | null>(null);
  const list = useFetch<Queue>(`/mensalidades/whatsapp-queue?mode=${mode}`);

  const rows = useMemo(
    () => (list.data?.rows ?? []).filter((row) => matchesQuery(query, [row.name, row.branchLabel])),
    [list.data, query],
  );

  async function send(row: QueueRow, contact: QueueContact) {
    window.open(contact.link, "_blank", "noopener");
    try {
      await api("/mensalidades/whatsapp-queue/sent", {
        method: "POST",
        body: JSON.stringify({
          memberId: row.memberId,
          phone: contact.phone,
          text: contact.text,
          transactionIds: row.items.map((item) => item.transactionId),
        }),
      });
      void list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a cobrança");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensagem copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Montando a fila de cobrança…" />;
  }

  const data = list.data;

  return (
    <FetchOverlay active={list.loading} label="Atualizando a fila…">
      <div>
        <PageHeader
          kicker="Mensalidades"
          title="Cobrança no WhatsApp"
          subtitle="Mensagem pronta para cada família, com o Pix copia e cola já com o valor. O envio sai do WhatsApp da tesouraria, sem custo."
          actions={
            <div className="page-head__actions">
              <PageGuide guide={whatsappChargeGuide} />
            </div>
          }
        />

        <div className="tabs">
          <button
            className={`tab ${mode === "overdue" ? "is-on" : ""}`}
            type="button"
            onClick={() => setMode("overdue")}
          >
            Em atraso
          </button>
          <button
            className={`tab ${mode === "upcoming" ? "is-on" : ""}`}
            type="button"
            onClick={() => setMode("upcoming")}
          >
            Vencendo este mês
          </button>
        </div>

        <div className="grid-stats">
          <StatCard
            title="Associados"
            value={String(data.totals.members)}
            hint={mode === "overdue" ? "Com mensalidade vencida" : "Com mensalidade a vencer no mês"}
          />
          <StatCard
            title={mode === "overdue" ? "Em aberto" : "A receber"}
            value={brl(data.totals.amount)}
            hint={
              mode === "overdue" ? `Com acréscimo por atraso (após o dia ${data.dueDay})` : "Valor após o vencimento"
            }
            tone={mode === "overdue" ? "neg" : ""}
          />
          <StatCard
            title="Sem telefone"
            value={String(data.totals.withoutPhone)}
            hint="Cadastre o telefone do responsável em Associados"
            tone={data.totals.withoutPhone ? "neg" : ""}
          />
        </div>

        <FilterBar>
          <label className="field">
            <span>Buscar</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Associado ou ramo…" />
          </label>
        </FilterBar>

        <article className="card" style={{ marginTop: "1rem" }}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Associado</th>
                  <th>Meses</th>
                  <th className="num">Total</th>
                  <th>Última cobrança</th>
                  <th className="cell-actions">Enviar para</th>
                </tr>
              </thead>
              <AnimatedTableBody
                emptyColSpan={5}
                emptyMessage={
                  mode === "overdue" ? "Nenhuma mensalidade em atraso. 🎉" : "Nenhuma mensalidade a vencer neste mês."
                }
              >
                {rows.map((row, index) => (
                  <AnimatedRow key={row.memberId} index={index}>
                    <td>
                      <strong>{row.name}</strong>
                      <div className="muted">
                        {row.branchLabel}
                        {row.hasAgreement ? (
                          <>
                            {" "}
                            · <Badge kind="watch">Tem acordo de dívida</Badge>
                          </>
                        ) : null}
                      </div>
                    </td>
                    <td>{row.items.map((item) => item.label).join(", ")}</td>
                    <td className="num">
                      <strong>{brl(row.total)}</strong>
                      {row.surcharge > 0 ? <div className="muted">{brl(row.surcharge)} de acréscimo</div> : null}
                    </td>
                    <td>
                      <LastSent at={row.lastSentAt} />
                    </td>
                    <td className="cell-actions">
                      {row.contacts.length ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {row.contacts.map((contact) => (
                            <button
                              key={contact.phone}
                              className="btn btn-outline btn-sm"
                              type="button"
                              title={`${contact.name} · ${contact.phone}`}
                              onClick={() => void send(row, contact)}
                            >
                              <FaWhatsapp /> {contact.relationship || contact.name}
                            </button>
                          ))}
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPreview(row)}>
                            Ver mensagem
                          </button>
                        </div>
                      ) : (
                        <span className="muted">Sem telefone</span>
                      )}
                    </td>
                  </AnimatedRow>
                ))}
              </AnimatedTableBody>
            </table>
          </div>
        </article>

        <AnimatePresence>
          {preview?.contacts[0] ? (
            <Modal title={`Mensagem · ${preview.name}`} onClose={() => setPreview(null)}>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0, fontFamily: "inherit" }}>
                {preview.contacts[0].text}
              </pre>
              <div className="modal-actions" style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button className="btn btn-outline" type="button" onClick={() => void copy(preview.contacts[0]!.text)}>
                  <FaCopy /> Copiar mensagem
                </button>
              </div>
            </Modal>
          ) : null}
        </AnimatePresence>
      </div>
    </FetchOverlay>
  );
}
