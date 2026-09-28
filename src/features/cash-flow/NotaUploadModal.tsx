import { useEffect, useRef, useState, type FormEvent } from "react";
import { FaCloudUploadAlt, FaFileAlt } from "react-icons/fa";
import { apiUpload } from "@/core/http/api-upload";
import Modal from "@/shared/ui/Modal";
import SubmitButton from "@/shared/ui/SubmitButton";
import { brl, formatDate } from "@/shared/lib/format";

type TxSummary = {
  id: string;
  description: string;
  date: string;
  amount: number;
  type: "income" | "expense";
};

type Props = {
  tx: TxSummary;
  onClose: () => void;
  onUploaded: () => void;
};

type Phase = "idle" | "uploading" | "processing" | "done";

export default function NotaUploadModal({ tx, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = phase === "uploading" || phase === "processing";

  useEffect(() => {
    if (phase !== "done") return;
    const timer = window.setTimeout(() => {
      onUploaded();
      onClose();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [phase, onUploaded, onClose]);

  function handleClose() {
    if (busy) return;
    onClose();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setError(null);
    setPhase("uploading");
    setPercent(0);
    const body = new FormData();
    body.append("file", file);
    try {
      await apiUpload(`/transactions/${tx.id}/nota`, body, (progress) => {
        setPercent(progress.percent);
        if (progress.percent >= 100) setPhase("processing");
      });
      setPercent(100);
      setPhase("done");
    } catch (err) {
      setPhase("idle");
      setPercent(0);
      setError(err instanceof Error ? err.message : "Não foi possível enviar a nota");
    }
  }

  const statusLabel =
    phase === "uploading"
      ? `Enviando… ${percent}%`
      : phase === "processing"
        ? "Gravando no armazenamento…"
        : phase === "done"
          ? "Nota anexada"
          : null;

  return (
    <Modal title="Anexar nota de conciliação" onClose={handleClose}>
      <form onSubmit={(e) => void onSubmit(e)} className="form-grid nota-upload">
        {error ? <div className="error wide">{error}</div> : null}

        <p className="muted wide">
          {formatDate(tx.date)} · {tx.type === "income" ? "+" : "−"} {brl(tx.amount)}
          <br />
          <strong>{tx.description}</strong>
        </p>

        <label className="field wide">
          <span>Arquivo (PDF ou imagem, até 10 MB)</span>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
            disabled={busy || phase === "done"}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />
          {file ? (
            <small className="nota-upload__file">
              <FaFileAlt aria-hidden /> {file.name} · {(file.size / 1024).toFixed(0)} KB
            </small>
          ) : (
            <small className="muted">Selecione a nota fiscal ou o comprovante deste lançamento.</small>
          )}
        </label>

        {phase !== "idle" ? (
          <div className="nota-upload__progress wide" role="status" aria-live="polite">
            <div className="nota-upload__bar" aria-hidden>
              <div
                className={`nota-upload__fill${phase === "processing" ? " is-indeterminate" : ""}${phase === "done" ? " is-done" : ""}`}
                style={phase === "processing" || phase === "done" ? undefined : { width: `${percent}%` }}
              />
            </div>
            <div className="nota-upload__status">
              <FaCloudUploadAlt aria-hidden />
              <span>{statusLabel}</span>
            </div>
          </div>
        ) : null}

        <div className="modal-actions wide">
          <button className="btn btn-ghost" type="button" onClick={handleClose} disabled={busy}>
            Cancelar
          </button>
          <SubmitButton busy={busy} busyLabel={statusLabel ?? "Enviando…"} disabled={!file || phase === "done"}>
            Enviar nota
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
