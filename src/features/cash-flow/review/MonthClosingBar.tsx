import { useState } from "react";
import type { MonthClosingRow } from "@/domain";
import { api } from "@/core/http";
import { brl, formatDateTime, MONTHS } from "@/shared/lib/format";

type Props = {
  year: number;
  month: number;
  closing: MonthClosingRow | undefined;
  isAdmin: boolean;
  pendingReview: { unidentified: number };
  onChanged: (message: string) => void;
};

/** Situação do mês no topo do caixa: aberto (com Fechar) ou fechado (só leitura; admin reabre). */
export default function MonthClosingBar({ year, month, closing, isAdmin, pendingReview, onChanged }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  const label = `${MONTHS[month - 1]?.toLowerCase()}/${year}`;
  const today = new Date();
  const finished = yearMonth < `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  async function run(action: "close" | "reopen") {
    setBusy(true);
    setError(null);
    try {
      if (action === "close") {
        await api("/month-closings", { method: "POST", body: JSON.stringify({ yearMonth }) });
        onChanged(`${label} fechado. Os lançamentos pagos do mês ficam só leitura.`);
      } else {
        await api(`/month-closings/${yearMonth}`, { method: "DELETE" });
        onChanged(`${label} reaberto.`);
      }
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir");
    } finally {
      setBusy(false);
    }
  }

  if (closing) {
    return (
      <div className="closing-bar is-closed">
        <div>
          <strong>{label} fechado</strong>
          <span className="muted">
            {" "}
            em {formatDateTime(closing.closedAt)}
            {closing.closedByUser ? ` por ${closing.closedByUser.name}` : ""} · saldo no fechamento{" "}
            {brl(closing.balance)}
          </span>
        </div>
        {error ? <span className="error-inline">{error}</span> : null}
        {isAdmin ? (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void run("reopen")}>
            Reabrir (admin)
          </button>
        ) : (
          <span className="muted">Só o admin reabre.</span>
        )}
      </div>
    );
  }

  if (!finished) return null;
  return (
    <div className="closing-bar">
      <div>
        <strong>{label} está aberto</strong>
        <span className="muted"> · depois de conferido, feche para travar os lançamentos pagos do mês.</span>
      </div>
      {error ? <span className="error-inline">{error}</span> : null}
      {confirming ? (
        <div className="closing-bar__confirm">
          <span>
            Fechar {label}? Os lançamentos pagos do mês ficam só leitura.
            {pendingReview.unidentified ? ` Ainda há ${pendingReview.unidentified} crédito(s) sem tipo.` : ""}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void run("close")}>
            Fechar {label}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirming(true)}>
          Fechar o mês
        </button>
      )}
    </div>
  );
}
