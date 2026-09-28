import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaExpand, FaTimes } from "react-icons/fa";
import { api } from "@/core/http";
import { duration, ease } from "@/shared/lib/motion";

type NotaMeta = {
  url: string;
  fileName: string;
  contentType: string;
};

type Props = {
  transactionId: string;
  fileName?: string;
  onClose: () => void;
};

/** Abre a nota do lançamento em visualização ampliada (URL assinada do S3). */
export async function fetchNotaAmpliada(transactionId: string): Promise<NotaMeta> {
  return api<NotaMeta>(`/transactions/${transactionId}/nota`);
}

export default function NotaViewer({ transactionId, fileName, onClose }: Props) {
  const [meta, setMeta] = useState<NotaMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchNotaAmpliada(transactionId)
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível abrir a nota");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  const title = meta?.fileName || fileName || "Nota";
  const isPdf = (meta?.contentType ?? "").includes("pdf");
  const isImage = (meta?.contentType ?? "").startsWith("image/");

  return (
    <motion.div
      className="nota-viewer-back"
      onClick={onClose}
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: duration.fast, ease }}
    >
      <motion.div
        className="nota-viewer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: duration.base, ease }}
      >
        <header className="nota-viewer__head">
          <div className="nota-viewer__title">
            <FaExpand aria-hidden />
            <span>{title}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar">
            <FaTimes />
          </button>
        </header>
        <div className="nota-viewer__body">
          {loading ? <p className="muted">Carregando nota…</p> : null}
          {error ? <p className="error">{error}</p> : null}
          {!loading && !error && meta && isImage ? (
            <img src={meta.url} alt={title} className="nota-viewer__img" />
          ) : null}
          {!loading && !error && meta && isPdf ? (
            <iframe title={title} src={meta.url} className="nota-viewer__frame" />
          ) : null}
          {!loading && !error && meta && !isImage && !isPdf ? (
            <p className="muted">
              Tipo de arquivo não pré-visualizável.{" "}
              <a href={meta.url} target="_blank" rel="noreferrer">
                Abrir em nova aba
              </a>
            </p>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
