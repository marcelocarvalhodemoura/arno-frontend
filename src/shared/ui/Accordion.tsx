import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { duration, ease } from "@/shared/lib/motion";

type Props = {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export default function Accordion({ title, defaultOpen = false, className = "", children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div className={`accordion ${className}${open ? " is-open" : ""}`.trim()}>
      <button
        type="button"
        className="accordion__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="accordion__title">{title}</span>
        <span className="accordion__hint" aria-hidden>
          {open ? "Recolher" : "Mostrar"}
        </span>
        <span className="accordion__chevron" aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            className="accordion__panel"
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: duration.fast } }
                : {
                    height: 0,
                    opacity: 0,
                    transition: {
                      height: { duration: 0.36, ease },
                      opacity: { duration: 0.2, ease },
                    },
                  }
            }
            transition={
              reduceMotion
                ? { duration: duration.fast }
                : {
                    height: { duration: 0.46, ease },
                    opacity: { duration: 0.32, ease, delay: 0.04 },
                  }
            }
            style={{ overflow: "hidden" }}
          >
            <motion.div
              className="accordion__body"
              initial={reduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.34, ease, delay: 0.08 }}
            >
              {children}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
