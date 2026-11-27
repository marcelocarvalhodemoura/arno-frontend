import { useState, type FormEvent } from "react";
import { api } from "@/core/http";
import { useFetch } from "@/shared/hooks/use-fetch";
import { useToast } from "@/shared/feedback/toast";
import { formatDate, formatDateTime, todayISO } from "@/shared/lib/format";
import { formClass, submitAttempt } from "@/shared/lib/form";
import SubmitButton from "@/shared/ui/SubmitButton";

export type DepartureKind = "formal" | "informal" | "abandono";

export const DEPARTURE_KIND_LABEL: Record<DepartureKind, string> = {
  formal: "Formal (pedido por e-mail)",
  informal: "Informal (confirmado por alguém)",
  abandono: "Abandono (sem resposta)",
};

type StatusHistoryEntry = {
  id: string;
  at: string;
  toStatus: "active" | "inactive";
  reason: string;
  effectiveDate?: string | null;
  kind?: DepartureKind | null;
  confirmedBy?: string | null;
  corrections?: { at: string; from: string; to: string; reason: string }[];
  byUser?: { name: string } | null;
};

/** Resposta de PATCH /members/:id/status e da correção de data: efeitos nas cobranças. */
export type StatusChangeResponse = {
  trashedCount?: number;
  paidDuringAbsence?: { date: string; amount: number }[];
};

/** Frase sobre o efeito nas cobranças, para o toast. */
export function statusChangeEffects(result: StatusChangeResponse): string {
  const parts: string[] = [];
  if (result.trashedCount) parts.push(`${result.trashedCount} mensalidade(s) pendente(s) foram para a lixeira`);
  const paid = result.paidDuringAbsence ?? [];
  if (paid.length) {
    parts.push(
      `atenção: ${paid.length} mensalidade(s) paga(s) no período fora (${paid
        .map((tx) => formatDate(tx.date).slice(3))
        .join(", ")}) — decisão da tesouraria`,
    );
  }
  return parts.length ? ` ${parts.join("; ")}.` : "";
}

const effectiveOf = (entry: StatusHistoryEntry) => entry.effectiveDate ?? entry.at.slice(0, 10);

/** Saídas e retornos do associado, com a data efetiva e a correção dessa data. */
export default function StatusHistorySection({ memberId, onChanged }: { memberId: string; onChanged?: () => void }) {
  const history = useFetch<StatusHistoryEntry[]>(`/members/${memberId}/status-history`);
  const toast = useToast();
  const [editing, setEditing] = useState<StatusHistoryEntry | null>(null);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const entries = history.data ?? [];
  if (!entries.length) return null;

  function startEdit(entry: StatusHistoryEntry) {
    setEditing(entry);
    setDate(effectiveOf(entry));
    setReason("");
    setError(null);
    setAttempted(false);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const result = await api<StatusChangeResponse>(`/members/${memberId}/status-history/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ effectiveDate: date, reason: reason.trim() }),
      });
      setEditing(null);
      await history.reload();
      onChanged?.();
      toast.success(`Data efetiva corrigida para ${formatDate(date)}.${statusChangeEffects(result)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível corrigir a data");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <span className="muted">Saídas e retornos</span>
      <table className="table profile__recent">
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{formatDate(effectiveOf(entry))}</td>
              <td>
                <strong>{entry.toStatus === "inactive" ? "Saída" : "Retorno"}</strong>
                {entry.kind ? ` · ${DEPARTURE_KIND_LABEL[entry.kind].split(" (")[0].toLowerCase()}` : ""}
                {entry.confirmedBy ? ` · confirmado por ${entry.confirmedBy}` : ""}
                <div>{entry.reason}</div>
                <div className="muted">
                  registrado em {formatDateTime(entry.at)}
                  {entry.byUser ? ` por ${entry.byUser.name}` : ""}
                </div>
                {(entry.corrections ?? []).map((fix) => (
                  <div key={fix.at} className="muted">
                    data corrigida de {formatDate(fix.from)} para {formatDate(fix.to)} em {formatDateTime(fix.at)}:{" "}
                    {fix.reason}
                  </div>
                ))}
              </td>
              <td className="num">
                <button type="button" className="btn btn-ghost" onClick={() => startEdit(entry)}>
                  Corrigir data
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing ? (
        <form onSubmit={save} className={formClass("form-grid", attempted)} noValidate>
          {error ? <div className="error wide">{error}</div> : null}
          <p className="wide muted">
            Corrigir a data da {editing.toStatus === "inactive" ? "saída" : "volta"} registrada em{" "}
            {formatDate(effectiveOf(editing))}. As mensalidades pendentes dos meses fora do grupo vão para a lixeira, e
            os meses que voltarem a ser devidos são gerados de novo. As pagas não mudam.
          </p>
          <label className="field">
            <span>Data efetiva</span>
            <input required type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field wide">
            <span>Justificativa da correção</span>
            <textarea
              required
              minLength={3}
              placeholder="Ex.: chefe de seção confirmou que o jovem parou em julho"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="modal-actions wide">
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </button>
            <SubmitButton busy={saving} busyLabel="Salvando…">
              Salvar correção
            </SubmitButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}
