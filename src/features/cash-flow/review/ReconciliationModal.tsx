import { useState } from "react";
import type { ReconciliationItem } from "@/domain";
import Modal from "@/shared/ui/Modal";
import { api } from "@/core/http";
import { useFetch } from "@/shared/hooks/use-fetch";
import { brl, formatDate } from "@/shared/lib/format";

type Props = { from: string; to: string; onClose: () => void; onChanged: (message: string) => void };

/** Para cada Pix sem tipo, a mensalidade que ele provavelmente paga. Um clique confirma. */
export default function ReconciliationModal({ from, to, onClose, onChanged }: Props) {
  const list = useFetch<ReconciliationItem[]>(`/reconciliation?from=${from}&to=${to}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(item: ReconciliationItem, action: "confirm" | "dismiss") {
    if (!item.suggestion) return;
    setBusy(item.creditId);
    setError(null);
    try {
      await api(`/reconciliation/${action}`, {
        method: "POST",
        body: JSON.stringify({ creditId: item.creditId, pendingId: item.suggestion.pendingId }),
      });
      onChanged(action === "confirm" ? `${item.suggestion.label}: baixada.` : "Sugestão recusada.");
      await list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir");
    } finally {
      setBusy(null);
    }
  }

  const items = list.data ?? [];
  const withSuggestion = items.filter((item) => item.suggestion);
  return (
    <Modal title="Conciliação assistida" onClose={onClose}>
      <p className="muted">
        Créditos do extrato ainda sem tipo, com a mensalidade que cada um provavelmente paga. Confirme para dar baixa na
        grade; os que ficarem sem sugestão seguem para Identificar.
      </p>
      {error ? <div className="error">{error}</div> : null}
      {list.loading ? (
        <p className="muted">Procurando…</p>
      ) : items.length === 0 ? (
        <p className="empty">Nenhum crédito sem tipo neste período.</p>
      ) : (
        <div className="review-groups">
          {items.map((item) => (
            <article key={item.creditId} className="review-group">
              <div className="review-item">
                <div className="review-item__main">
                  <strong>
                    {brl(item.amount)} · {formatDate(item.date)}
                  </strong>
                  <span className="muted">{item.description}</span>
                </div>
              </div>
              {item.suggestion ? (
                <>
                  <div className="review-suggestion">
                    Parece: <strong>{item.suggestion.label}</strong>
                    <small className="muted">Por quê: {item.reason}.</small>
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy !== null}
                      onClick={() => void act(item, "dismiss")}
                    >
                      Não é isso
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy !== null}
                      onClick={() => void act(item, "confirm")}
                    >
                      Confirmar
                    </button>
                  </div>
                </>
              ) : (
                <div className="review-suggestion is-none">{item.reason}. Vai para a fila Identificar.</div>
              )}
            </article>
          ))}
        </div>
      )}
      <div className="modal-actions">
        <span className="muted">
          {withSuggestion.length} de {items.length} com sugestão
        </span>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
