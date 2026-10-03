import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { duration, ease } from "@/shared/lib/motion";

type ToastKind = "success" | "error";

type ToastAction = { label: string; onClick: () => void };

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
};

type ToastOptions = { action?: ToastAction; durationMs?: number };

type ToastApi = {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi>({
  success: () => {},
  error: () => {},
});

let nextId = 1;

function ToastStack({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="toasts" aria-live="polite" aria-relevant="additions">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`toast toast--${toast.kind}`}
            role="status"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, x: 16 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
            transition={{ duration: duration.base, ease }}
          >
            {toast.kind === "success" ? <FaCheckCircle /> : <FaExclamationCircle />}
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, options?: ToastOptions) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, kind, message, action: options?.action }]);
      window.setTimeout(() => dismiss(id), options?.durationMs ?? (options?.action ? 8000 : 4200));
    },
    [dismiss],
  );

  const value = useMemo<ToastApi>(
    () => ({
      success: (message, options) => push("success", message, options),
      error: (message) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
