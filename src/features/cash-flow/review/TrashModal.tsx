import { useState } from "react";
import type { TrashItem } from "@/domain";
import Modal from "@/shared/ui/Modal";
import { api } from "@/core/http";
import { useFetch } from "@/shared/hooks/use-fetch";
import { brl, formatDate, formatDateTime } from "@/shared/lib/format";

type Props = { isAdmin: boolean; onClose: () => void; onChanged: (message: string) => void };

/** Lançamentos excluídos nos últimos 30 dias, com restauração. Só o admin esvazia. */
export default function TrashModal({ isAdmin, onClose, onChanged }: Props) {
  const list = useFetch<TrashItem[]>("/trash");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore(item: TrashItem) {
    setBusy(item.id);
    setError(null);
    try {
      await api(`/trash/${item.id}/restore`, { method: "POST" });
      onChanged(`“${item.transaction.description}” voltou para o caixa.`);
      await list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível restaurar");
    } finally {
      setBusy(null);
    }
  }

  async function empty() {
    setBusy("all");
    try {
      const result = await api<{ removed: number }>("/trash", { method: "DELETE" });
      onChanged(`Lixeira esvaziada (${result.removed} lançamento(s)).`);
      setConfirmEmpty(false);
      await list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível esvaziar");
    } finally {
      setBusy(null);
    }
  }

  const items = list.data ?? [];
  return (
    <Modal title="Lixeira" onClose={onClose}>
      <p className="muted">Lançamentos excluídos ficam aqui por 30 dias. Depois disso saem de vez.</p>
      {error ? <div className="error">{error}</div> : null}
      {list.loading ? (
        <p className="muted">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="empty">A lixeira está vazia.</p>
      ) : (
        <div className="review-list">
          {items.map((item) => (
            <div key={item.id} className="review-item">
              <div className="review-item__main">
                <strong>{item.transaction.description}</strong>
                <span className="muted">
                  {formatDate(item.transaction.date)} · {item.transaction.movementTypeName ?? "Sem tipo"}
                  {item.transaction.memberName ? ` · ${item.transaction.memberName}` : ""}
                </span>
                <small className="muted">
                  Excluído em {formatDateTime(item.deletedAt)}
                  {item.deletedBy ? ` por ${item.deletedBy.name}` : ""}
                </small>
              </div>
              <span className={item.transaction.type === "income" ? "is-pos" : "is-neg"}>
                {item.transaction.type === "income" ? "+" : "−"} {brl(item.transaction.amount)}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy !== null}
                onClick={() => void restore(item)}
              >
                {busy === item.id ? "Restaurando…" : "Restaurar"}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="modal-actions">
        {isAdmin && items.length ? (
          confirmEmpty ? (
            <>
              <span className="muted">Apagar de vez {items.length} lançamento(s)?</span>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmEmpty(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" disabled={busy !== null} onClick={() => void empty()}>
                Apagar de vez
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmEmpty(true)}>
              Esvaziar lixeira
            </button>
          )
        ) : null}
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
