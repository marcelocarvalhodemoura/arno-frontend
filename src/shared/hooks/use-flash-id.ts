import { useCallback, useEffect, useRef, useState } from "react";

/** Highlights a list row briefly after create/update. */
export function useFlashId(ms = 1400) {
  const [flashId, setFlashId] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  const flash = useCallback(
    (id: string | null | undefined) => {
      if (!id) return;
      if (timer.current != null) window.clearTimeout(timer.current);
      setFlashId(id);
      timer.current = window.setTimeout(() => {
        setFlashId((current) => (current === id ? null : current));
        timer.current = null;
      }, ms);
    },
    [ms],
  );

  return [flashId, flash] as const;
}
