import { useState } from "react";
import type { DuplicateGroup, DuplicateTx } from "@/domain";
import Modal from "@/shared/ui/Modal";
import { api } from "@/core/http";
import { useFetch } from "@/shared/hooks/use-fetch";
import { brl, formatDate, formatDateTime, originLabel } from "@/shared/lib/format";

function Line({ tx, tag }: { tx: DuplicateTx; tag: string }) {
  return (
    <div className="review-item">
      <div className="review-item__main">
        <strong>{tx.description}</strong>
        <span className="muted">
          {formatDate(tx.date)} · {tx.movementTypeName ?? "Sem tipo"}
          {tx.memberName ? ` · ${tx.memberName}` : ""} · {originLabel(tx.origin, tx.importSource ?? undefined)}
        </span>
        <small className="muted">Lançado em {formatDateTime(tx.createdAt)}</small>
      </div>
      <span>{brl(tx.amount)}</span>
      <span className="badge">{tag}</span>
    </div>
  );
}

/** Pares com mesmo dia, valor e histórico. Nada é apagado sem a tesouraria decidir. */
export default function DuplicatesModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const list = useFetch<DuplicateGroup[]>("/duplicates");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(group: DuplicateGroup, action: "keep" | "drop") {
    setBusy(group.key);
    setError(null);
    try {
      if (action === "keep") {
        await api("/duplicates/dismiss", {
          method: "POST",
          body: JSON.stringify({ ids: [group.keep.id, ...group.drop.map((tx) => tx.id)] }),
        });
        onChanged("Marcados como lançamentos diferentes.");
      } else {
        await api("/duplicates/resolve", {
          method: "POST",
          body: JSON.stringify({ keepId: group.keep.id, dropIds: group.drop.map((tx) => tx.id) }),
        });
        onChanged("Cópia enviada para a lixeira (pode ser restaurada por 30 dias).");
      }
      await list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir");
    } finally {
      setBusy(null);
    }
  }

  const groups = list.data ?? [];
  return (
    <Modal title="Possíveis duplicados" onClose={onClose}>
      <p className="muted">
        Lançamentos com o mesmo dia, valor e histórico. Confira e decida: se forem o mesmo pagamento, a cópia vai para a
        lixeira; se forem diferentes, o par não aparece mais.
      </p>
      {error ? <div className="error">{error}</div> : null}
      {list.loading ? (
        <p className="muted">Procurando…</p>
      ) : groups.length === 0 ? (
        <p className="empty">Nenhum possível duplicado para revisar.</p>
      ) : (
        <div className="review-groups">
          {groups.map((group) => (
            <article key={group.key} className="review-group">
              <Line tx={group.keep} tag="Fica" />
              {group.drop.map((tx) => (
                <Line key={tx.id} tx={tx} tag="Cópia" />
              ))}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy !== null}
                  onClick={() => void act(group, "keep")}
                >
                  São diferentes
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={busy !== null}
                  onClick={() => void act(group, "drop")}
                >
                  Excluir a cópia
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
