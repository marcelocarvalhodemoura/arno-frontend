import { Children, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { duration, ease, rowTransition, rowVariants, rowVariantsReduced } from "@/shared/lib/motion";

type BodyProps = {
  emptyColSpan: number;
  emptyMessage: string;
  children: ReactNode;
};

export function AnimatedTableBody({ emptyColSpan, emptyMessage, children }: BodyProps) {
  const rows = Children.toArray(children);
  const hasRows = rows.length > 0;

  return (
    <tbody>
      <AnimatePresence initial={false}>
        {!hasRows ? (
          <AnimatedRow key="__empty">
            <td colSpan={emptyColSpan} className="muted">
              {emptyMessage}
            </td>
          </AnimatedRow>
        ) : (
          rows
        )}
      </AnimatePresence>
    </tbody>
  );
}

type RowProps = {
  children: ReactNode;
  index?: number;
  flash?: boolean;
  className?: string;
};

export function AnimatedRow({ children, index = 0, flash = false, className }: RowProps) {
  const reduce = useReducedMotion();
  const classes = [className, flash ? "is-flash" : null].filter(Boolean).join(" ");

  return (
    <motion.tr
      className={classes || undefined}
      variants={reduce ? rowVariantsReduced : rowVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={rowTransition(index, Boolean(reduce))}
      style={reduce ? undefined : { originY: 0 }}
    >
      {children}
    </motion.tr>
  );
}

type FadeProps = {
  children: ReactNode;
  show?: boolean;
  className?: string;
};

/** Soft fade for filter panels / empty callouts outside tables. */
export function FadeIn({ children, show = true, className }: FadeProps) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          className={className}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduce ? duration.fast : duration.base, ease }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
