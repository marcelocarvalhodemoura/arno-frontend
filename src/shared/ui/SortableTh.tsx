import type { ReactNode } from "react";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";

export type SortDir = "asc" | "desc";

type Props<K extends string> = {
  label: ReactNode;
  column: K;
  active: K;
  dir: SortDir;
  onSort: (column: K) => void;
  className?: string;
  align?: "left" | "right";
};

export default function SortableTh<K extends string>({
  label,
  column,
  active,
  dir,
  onSort,
  className = "",
  align = "left",
}: Props<K>) {
  const isActive = active === column;
  const Icon = !isActive ? FaSort : dir === "asc" ? FaSortUp : FaSortDown;
  return (
    <th
      className={`sortable-th${align === "right" ? " num" : ""}${isActive ? " is-sorted" : ""}${className ? ` ${className}` : ""}`}
      aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button type="button" className="sortable-th__btn" onClick={() => onSort(column)}>
        <span>{label}</span>
        <Icon aria-hidden className="sortable-th__icon" />
      </button>
    </th>
  );
}

export function nextSortDir(current: SortDir | null, sameColumn: boolean): SortDir {
  if (!sameColumn) return "asc";
  return current === "asc" ? "desc" : "asc";
}

const TEXT_COLLATOR = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export function compareText(a: string, b: string) {
  return TEXT_COLLATOR.compare(a, b);
}

export function compareNumber(a: number, b: number) {
  return a - b;
}
