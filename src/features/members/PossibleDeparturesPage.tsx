import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FaCopy, FaEnvelope, FaUserSlash, FaWhatsapp } from "react-icons/fa";
import { api } from "@/core/http";
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
import SearchableSelect from "@/shared/ui/SearchableSelect";
import StatCard, { Badge } from "@/shared/ui/StatCard";
import MemberStatusModal from "@/features/members/MemberStatusModal";

type Contact = { name: string; relationship: string; phone: string; link: string; text: string };

type Row = {
  memberId: string;
  name: string;
  branchLabel: string;
  streak: number;
  since: string;
  months: string[];
  openAmount: number;
  lastPaidAt: string | null;
  hasAgreement: boolean;
  suggestedEffectiveDate: string;
  contacts: Contact[];
  hasEmail: boolean;
  lastCheck: { at: string; deadline: string; expired: boolean } | null;
};

type Report = {
  months: number;
  deadlineDays: number;
  rows: Row[];
  totals: { members: number; openAmount: number; contacted: number; expired: number };
};

type Filter = "all" | "not-contacted" | "waiting" | "expired";

function CheckStatus({ check }: { check: Row["lastCheck"] }) {
  if (!check) return <Badge kind="waived">Não perguntado</Badge>;
  return (
    <span title={`Perguntado em ${formatDateTime(check.at)}`}>
      <Badge kind={check.expired ? "watch" : "pending"}>
        {check.expired
          ? `Prazo vencido em ${formatDate(check.deadline)}`
          : `Aguardando até ${formatDate(check.deadline)}`}
      </Badge>
    </span>
  );
}

/**
 * Jovens ativos com várias mensalidades vencidas seguidas: a tesouraria pergunta à família se o jovem continua
 * e, confirmada a saída (ou vencido o prazo sem resposta), registra o desligamento com a data efetiva.
 */
export default function PossibleDeparturesPage() {
  const toast = useToast();
  const [months, setMonths] = useState("3");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [preview, setPreview] = useState<Row | null>(null);
  const [leaving, setLeaving] = useState<Row | null>(null);
  const [emailing, setEmailing] = useState<string | null>(null);
  const report = useFetch<Report>(`/member-departures?months=${months}`);

  const rows = useMemo(
    () =>
      (report.data?.rows ?? []).filter((row) => {
        if (!matchesQuery(query, [row.name, row.branchLabel])) return false;
        if (filter === "not-contacted") return !row.lastCheck;
        if (filter === "waiting") return Boolean(row.lastCheck && !row.lastCheck.expired);
        if (filter === "expired") return Boolean(row.lastCheck?.expired);
        return true;
      }),
    [report.data, query, filter],
  );

  async function sendWhatsApp(row: Row, contact: Contact) {
    window.open(contact.link, "_blank", "noopener");
    try {
      await api(`/member-departures/${row.memberId}/whatsapp`, {
        method: "POST",
        body: JSON.stringify({ phone: contact.phone, text: contact.text }),
      });
      void report.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar o envio");
    }
  }

  async function sendEmail(row: Row) {
    setEmailing(row.memberId);
    try {
      const result = await api<{ summary: { queued: number; skipped: number } }>(
        `/member-departures/${row.memberId}/email`,
        { method: "POST" },
      );
      if (result.summary.queued) {
        toast.success(`E-mail na fila para ${result.summary.queued} destinatário(s).`);
      } else {
        toast.error("Nenhum e-mail cadastrado para o jovem ou os responsáveis.");
      }
      void report.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o e-mail");
    } finally {
      setEmailing(null);
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

  if (!report.data) {
    if (report.error) return <p className="error">{report.error}</p>;
    return <PageLoader label="Procurando possíveis desligamentos…" />;
  }

  const data = report.data;

  return (
    <FetchOverlay active={report.loading} label="Atualizando…">
      <div>
        <PageHeader
          kicker="Cadastros"
          title="Possíveis desligamentos"
          subtitle={`Jovens ativos com ${data.months} ou mais mensalidades vencidas seguidas. Pergunte à família se o jovem continua; sem resposta em ${data.deadlineDays} dias, registre o desligamento como abandono. Ninguém é desligado automaticamente.`}
        />

        <div className="grid-stats">
          <StatCard
            title="Jovens"
            value={String(data.totals.members)}
            hint={`${data.months}+ meses seguidos em aberto`}
          />
          <StatCard
            title="Em aberto"
            value={brl(data.totals.openAmount)}
            hint="Soma das mensalidades da sequência"
            tone="neg"
          />
          <StatCard
            title="Já perguntados"
            value={String(data.totals.contacted)}
            hint={`${data.totals.expired} com prazo vencido`}
            tone={data.totals.expired ? "neg" : ""}
          />
        </div>

        <FilterBar>
          <label className="field">
            <span>Buscar</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Jovem ou ramo…" />
          </label>
          <label className="field">
            <span>Meses seguidos em aberto</span>
            <SearchableSelect
              value={months}
              onChange={setMonths}
              options={["2", "3", "4", "5", "6"].map((value) => ({ value, label: `${value} ou mais` }))}
            />
          </label>
          <label className="field">
            <span>Situação do contato</span>
            <SearchableSelect
              value={filter}
              onChange={(value) => setFilter(value as Filter)}
              options={[
                { value: "all", label: "Todos" },
                { value: "not-contacted", label: "Não perguntados" },
                { value: "waiting", label: "Aguardando resposta" },
                { value: "expired", label: "Prazo vencido" },
              ]}
            />
          </label>
        </FilterBar>

        <article className="card" style={{ marginTop: "1rem" }}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Jovem</th>
                  <th>Em aberto</th>
                  <th>Último pagamento</th>
                  <th>Contato</th>
                  <th className="cell-actions">Ações</th>
                </tr>
              </thead>
              <AnimatedTableBody emptyColSpan={5} emptyMessage="Nenhum jovem nessa situação. 🎉">
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
                    <td>
                      <strong>{row.streak} meses</strong> · {brl(row.openAmount)}
                      <div className="muted">{row.months.join(", ")}</div>
                    </td>
                    <td>{row.lastPaidAt ? formatDate(row.lastPaidAt) : <span className="muted">nunca</span>}</td>
                    <td>
                      <CheckStatus check={row.lastCheck} />
                    </td>
                    <td className="cell-actions">
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {row.contacts.map((contact) => (
                          <button
                            key={contact.phone}
                            className="btn btn-outline btn-sm"
                            type="button"
                            title={`${contact.name} · ${contact.phone}`}
                            onClick={() => void sendWhatsApp(row, contact)}
                          >
                            <FaWhatsapp /> {contact.relationship || contact.name}
                          </button>
                        ))}
                        {row.hasEmail ? (
                          <button
                            className="btn btn-outline btn-sm"
                            type="button"
                            disabled={emailing === row.memberId}
                            onClick={() => void sendEmail(row)}
                          >
                            <FaEnvelope /> E-mail
                          </button>
                        ) : null}
                        {row.contacts.length ? (
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPreview(row)}>
                            Ver mensagem
                          </button>
                        ) : null}
                        {!row.contacts.length && !row.hasEmail ? <span className="muted">Sem contato</span> : null}
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setLeaving(row)}>
                          <FaUserSlash /> Registrar desligamento
                        </button>
                      </div>
                    </td>
                  </AnimatedRow>
                ))}
              </AnimatedTableBody>
            </table>
          </div>
        </article>

        <AnimatePresence>
          {preview?.contacts[0] ? (
            <Modal key="preview" title={`Mensagem · ${preview.name}`} onClose={() => setPreview(null)}>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontFamily: "inherit" }}>
                {preview.contacts[0].text}
              </pre>
              <div className="modal-actions" style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button className="btn btn-outline" type="button" onClick={() => void copy(preview.contacts[0]!.text)}>
                  <FaCopy /> Copiar mensagem
                </button>
              </div>
            </Modal>
          ) : null}
          {leaving ? (
            <MemberStatusModal
              key="leaving"
              member={{ id: leaving.memberId, name: leaving.name, status: "active" }}
              initial={{
                effectiveDate: leaving.suggestedEffectiveDate,
                kind: leaving.lastCheck?.expired ? "abandono" : undefined,
                reason: leaving.lastCheck?.expired
                  ? `Sem resposta à pergunta de permanência enviada em ${formatDate(leaving.lastCheck.at.slice(0, 10))} (prazo ${formatDate(leaving.lastCheck.deadline)}). Mensalidades em aberto desde ${leaving.months[0]}.`
                  : `Mensalidades em aberto desde ${leaving.months[0]}.`,
              }}
              onClose={() => setLeaving(null)}
              onDone={async () => {
                setLeaving(null);
                await report.reload();
              }}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </FetchOverlay>
  );
}
