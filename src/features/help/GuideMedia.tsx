import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import { duration, ease, modalBackVariants } from "@/shared/lib/motion";
import type { GuideMedia as GuideMediaType } from "@/features/help/types";

type Props = {
  media: GuideMediaType;
};

/** Print do guia ou placeholder até existir captura em `/help/...`. Clique amplia. */
export default function GuideMedia({ media }: Props) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  return (
    <>
      <figure className="page-guide__media">
        {media.src ? (
          <button
            type="button"
            className="page-guide__media-btn"
            onClick={() => setOpen(true)}
            aria-label={`Ampliar: ${media.alt}`}
          >
            <img src={media.src} alt={media.alt} loading="lazy" />
          </button>
        ) : (
          <div className="page-guide__placeholder" role="img" aria-label={media.alt}>
            <span className="page-guide__placeholder-label">Ilustração</span>
            <span className="page-guide__placeholder-alt">{media.alt}</span>
          </div>
        )}
        {media.caption ? <figcaption>{media.caption}</figcaption> : null}
      </figure>

      <AnimatePresence>
        {open && media.src ? (
          <motion.div
            className="page-guide-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={media.alt}
            onClick={() => setOpen(false)}
            variants={modalBackVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: duration.fast, ease }}
          >
            <button
              type="button"
              className="page-guide-lightbox__close"
              aria-label="Fechar imagem ampliada"
              onClick={() => setOpen(false)}
            >
              <FaTimes />
            </button>
            <motion.img
              src={media.src}
              alt={media.alt}
              className="page-guide-lightbox__img"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              transition={{ duration: duration.base, ease }}
            />
            {media.caption ? <p className="page-guide-lightbox__caption">{media.caption}</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
