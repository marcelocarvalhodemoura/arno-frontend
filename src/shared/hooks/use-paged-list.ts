import { useEffect, useMemo, useRef, useState } from "react";
import { LISTING_BUSY_MS, paginate, type PageSize } from "@/shared/lib/listing/paginate";

export function useBusyOnChange(key: string, delayMs = LISTING_BUSY_MS) {
  const [busy, setBusy] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setBusy(true);
    const timer = window.setTimeout(() => setBusy(false), delayMs);
    return () => window.clearTimeout(timer);
  }, [key, delayMs]);

  return busy;
}

export function usePagedList<T>(items: T[], resetKey = "") {
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize, items.length]);

  const slice = useMemo(() => paginate(items, page, pageSize), [items, page, pageSize]);
  const busy = useBusyOnChange(`${resetKey}|${slice.currentPage}|${pageSize}`);

  return {
    ...slice,
    pageSize,
    busy,
    setPage,
    setPageSize,
  };
}
