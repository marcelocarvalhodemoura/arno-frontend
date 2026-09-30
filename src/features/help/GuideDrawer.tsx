import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import { duration, ease, modalBackVariants } from "@/shared/lib/motion";
import GuideMedia from "@/features/help/GuideMedia";
import type { PageGuideContent } from "@/features/help/types";

type Props = {
  guide: PageGuideContent;
  open: boolean;
  onClose: () => void;
};

export default function GuideDrawer({ guide, open, onClose }: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="page-guide-back"
          onClick={onClose}
          role="presentation"
          variants={modalBackVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: duration.fast, ease }}
        >
          <motion.aside
            className="page-guide"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`page-guide-title-${guide.id}`}
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: duration.base, ease }}
          >
            <header className="page-guide__head">
              <div>
                <span className="kicker">Manual prático</span>
                <h2 id={`page-guide-title-${guide.id}`}>{guide.title}</h2>
                <p>{guide.intro}</p>
              </div>
              <button type="button" className="page-guide__close" aria-label="Fechar guia" onClick={onClose}>
                <FaTimes />
              </button>
            </header>

            <ol className="page-guide__steps">
              {guide.steps.map((step, index) => (
                <li key={step.id} className="page-guide__step">
                  <div className="page-guide__step-head">
                    <span className="page-guide__step-num" aria-hidden>
                      {index + 1}
                    </span>
                    <h3>{step.title}</h3>
                  </div>
                  <div className="page-guide__step-body">{step.body}</div>
                  {step.media ? <GuideMedia media={step.media} /> : null}
                </li>
              ))}
            </ol>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
