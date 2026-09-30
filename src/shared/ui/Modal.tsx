import { useEffect, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { duration, ease, modalBackVariants, modalPanelVariants, modalPanelVariantsReduced } from "@/shared/lib/motion";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ title, onClose, children }: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="modal-back"
      onClick={onClose}
      role="presentation"
      variants={modalBackVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: duration.fast, ease }}
    >
      <motion.div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        variants={reduce ? modalPanelVariantsReduced : modalPanelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: duration.base, ease }}
      >
        <h2 id="modal-title">{title}</h2>
        {children}
      </motion.div>
    </motion.div>
  );
}
