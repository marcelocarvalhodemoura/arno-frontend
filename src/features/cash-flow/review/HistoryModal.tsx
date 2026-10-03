import type { HistoryRow } from "@/domain";
import Modal from "@/shared/ui/Modal";
import { useFetch } from "@/shared/hooks/use-fetch";
import { formatDateTime } from "@/shared/lib/format";

const KIND_LABEL: Record<HistoryRow["kind"], string> = {
  created: "Lançamento criado",
  updated: "Alterado",
  deleted: "Enviado para a lixeira",
  restored: "Restaurado da lixeira",
};

function show(field: string, value: string | null) {
  if (value === null) return "vazio";
  if (field === "amount") return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join("/");
  return value;
}

/** Linha do tempo de um lançamento: quem mudou o quê e quando. */
export default function HistoryModal({
  transactionId,
  title,
  onClose,
}: {
  transactionId: string;
  title: string;
  onClose: () => void;
}) {
  const history = useFetch<HistoryRow[]>(`/transactions/${transactionId}/history`);
  const rows = history.data ?? [];
  return (
    <Modal title="Histórico de alterações" onClose={onClose}>
      <p className="muted">{title}</p>
      {history.loading ? (
        <p className="muted">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="empty">Nenhuma alteração registrada desde que o histórico foi ativado.</p>
      ) : (
        <ol className="timeline">
          {rows.map((row) => (
            <li key={row.id}>
              <span className="timeline__when">
                {formatDateTime(row.at)} · {row.by?.name ?? "Sistema"}
              </span>
              <strong>{KIND_LABEL[row.kind]}</strong>
              {row.changes.length ? (
                <ul>
                  {row.changes.map((change) => (
                    <li key={change.field}>
                      {change.label}: <del>{show(change.field, change.from)}</del> →{" "}
                      <ins>{show(change.field, change.to)}</ins>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
