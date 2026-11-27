import { useState, type FormEvent } from "react";
import { api } from "@/core/http";
import { useToast } from "@/shared/feedback/toast";
import { formatDate, todayISO } from "@/shared/lib/format";
import { formClass, submitAttempt } from "@/shared/lib/form";
import Modal from "@/shared/ui/Modal";
import SearchableSelect from "@/shared/ui/SearchableSelect";
import SubmitButton from "@/shared/ui/SubmitButton";
import {
  DEPARTURE_KIND_LABEL,
  statusChangeEffects,
  type DepartureKind,
  type StatusChangeResponse,
} from "@/features/members/StatusHistorySection";

export type StatusModalMember = { id: string; name: string; status: "active" | "inactive" };

/** Inativar (com data efetiva, tipo e justificativa) ou reativar (com data do retorno) um associado. */
export default function MemberStatusModal({
  member,
  initial,
  onClose,
  onDone,
}: {
  member: StatusModalMember;
  /** Valores sugeridos, ex.: vindos da lista de possíveis desligamentos. */
  initial?: { effectiveDate?: string; kind?: DepartureKind; reason?: string };
  onClose: () => void;
  onDone: (memberId: string) => void | Promise<void>;
}) {
  const toast = useToast();
  const leaving = member.status === "active";
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [date, setDate] = useState(initial?.effectiveDate ?? todayISO());
  const [kind, setKind] = useState<DepartureKind | "">(initial?.kind ?? "");
  const [confirmedBy, setConfirmedBy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  function close() {
    if (!saving) onClose();
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    setSaving(true);
    setError(null);
    try {
      const result = await api<StatusChangeResponse>(`/members/${member.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: leaving ? "inactive" : "active",
          reason: reason.trim(),
          effectiveDate: date,
          ...(leaving ? { kind: kind || undefined } : {}),
          ...(leaving && kind === "informal" ? { confirmedBy: confirmedBy.trim() } : {}),
        }),
      });
      await onDone(member.id);
      toast.success(
        (leaving
          ? `Associado inativado com saída em ${formatDate(date)}.`
          : `Associado reativado com retorno em ${formatDate(date)}. Os meses em que esteve fora não serão cobrados.`) +
          statusChangeEffects(result),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar a situação do associado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`${leaving ? "Inativar" : "Reativar"} · ${member.name}`} onClose={close}>
      <form onSubmit={save} className={formClass("form-grid", attempted)} noValidate>
        {error ? <div className="error wide">{error}</div> : null}
        <p className="wide">
          {leaving
            ? "Informe quando o jovem saiu de fato, mesmo que tenha sido meses atrás. As mensalidades pendentes a partir do mês seguinte à saída vão para a lixeira; o mês da saída e os anteriores continuam devidos. Mensalidades pagas não mudam."
            : "Informe quando o associado voltou de fato. As cobranças voltam a partir do mês do retorno, e os meses em que esteve fora do grupo não são cobrados."}
        </p>
        <label className="field">
          <span>{leaving ? "Data da saída" : "Data do retorno"}</span>
          <input required type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {leaving ? (
          <label className="field">
            <span>Tipo de desligamento</span>
            <SearchableSelect
              required
              value={kind}
              placeholder="Selecione"
              onChange={(value) => setKind(value as DepartureKind)}
              options={(Object.keys(DEPARTURE_KIND_LABEL) as DepartureKind[]).map((item) => ({
                value: item,
                label: DEPARTURE_KIND_LABEL[item],
              }))}
            />
          </label>
        ) : null}
        {leaving && kind === "informal" ? (
          <label className="field wide">
            <span>Quem confirmou a saída</span>
            <input
              required
              placeholder="Ex.: Chefe Paula (seção escoteira) ou a mãe, por WhatsApp"
              value={confirmedBy}
              onChange={(e) => setConfirmedBy(e.target.value)}
            />
          </label>
        ) : null}
        <label className="field wide">
          <span>Justificativa</span>
          <textarea
            required
            minLength={3}
            autoFocus
            placeholder={
              leaving
                ? "Ex.: desligamento pedido por e-mail em 10/11; ou confirmado pelo chefe de seção"
                : "Ex.: retorno combinado com o responsável"
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <div className="modal-actions wide">
          <button className="btn btn-ghost" type="button" onClick={close} disabled={saving}>
            Cancelar
          </button>
          <SubmitButton busy={saving} busyLabel="Salvando…">
            {leaving ? "Inativar associado" : "Reativar associado"}
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
