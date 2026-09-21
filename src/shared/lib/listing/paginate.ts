export const PAGE_SIZES = [10, 15, 20, 50] as const;
export const LISTING_BUSY_MS = 360;
export type PageSize = (typeof PAGE_SIZES)[number];

export type PageSlice<T> = {
  total: number;
  pageCount: number;
  currentPage: number;
  pageRows: T[];
  fromRow: number;
  toRow: number;
};

export function paginate<T>(items: T[], page: number, pageSize: number): PageSlice<T> {
  const size = pageSize > 0 ? pageSize : 10;
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * size;
  return {
    total,
    pageCount,
    currentPage,
    pageRows: items.slice(start, start + size),
    fromRow: total === 0 ? 0 : start + 1,
    toRow: Math.min(start + size, total),
  };
}
