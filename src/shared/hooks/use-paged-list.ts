import { useEffect, useMemo, useState } from "react";
import { paginate, type PageSize } from "@/shared/lib/listing/paginate";

export function usePagedList<T>(items: T[], resetKey = "") {
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize, items.length]);

  const slice = useMemo(() => paginate(items, page, pageSize), [items, page, pageSize]);

  return {
    ...slice,
    pageSize,
    setPage,
    setPageSize,
  };
}
