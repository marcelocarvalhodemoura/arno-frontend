import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { FaChevronDown, FaSearch, FaTimes } from "react-icons/fa";
import { fold } from "@/shared/lib/csv";

export type SearchableOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
};

type MenuPos = { top: number; left: number; width: number; maxHeight: number };

function useMenuPosition(open: boolean, triggerRef: RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<MenuPos | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    function update() {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const preferBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;
      const maxHeight = Math.min(280, Math.max(140, preferBelow ? spaceBelow : spaceAbove));
      setPos({
        top: preferBelow ? rect.bottom + 4 : Math.max(8, rect.top - maxHeight - 4),
        left: rect.left,
        width: Math.max(rect.width, 220),
        maxHeight,
      });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, triggerRef]);

  return pos;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione",
  searchPlaceholder = "Buscar…",
  disabled = false,
  required = false,
  id,
  name,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const pos = useMenuPosition(open, triggerRef);

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const folded = fold(query);
    if (!folded) return options;
    return options.filter((option) => fold(option.label).includes(folded));
  }, [options, query]);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;
    setQuery("");
    const selectedIndex = Math.max(
      0,
      options.findIndex((option) => option.value === value),
    );
    setHighlight(selectedIndex);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, options, value]);

  useEffect(() => {
    setHighlight((current) => Math.min(current, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const menu = document.getElementById(listId);
      if (menu?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, listId]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => Math.min(filtered.length - 1, current + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlight];
      if (option && !option.disabled) choose(option.value);
    }
  }

  return (
    <div className={`search-select${className ? ` ${className}` : ""}${disabled ? " is-disabled" : ""}`}>
      {required ? (
        <select
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          disabled={disabled}
          onChange={() => undefined}
        >
          {options.map((option) => (
            <option key={`native-${option.value || "empty"}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : name ? (
        <input type="hidden" name={name} value={value} />
      ) : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`search-select__trigger${open ? " is-open" : ""}${!selected ? " is-placeholder" : ""}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="search-select__value">{selected?.label ?? placeholder}</span>
        <span className="search-select__icons">
          {value && !disabled && options.some((option) => option.value === "") ? (
            <span
              className="search-select__clear"
              role="button"
              tabIndex={-1}
              aria-label="Limpar"
              onClick={(event) => {
                event.stopPropagation();
                choose("");
              }}
            >
              <FaTimes />
            </span>
          ) : null}
          <FaChevronDown aria-hidden />
        </span>
      </button>

      {open && pos
        ? createPortal(
            <div
              id={listId}
              className="search-select__menu"
              role="listbox"
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
              }}
            >
              <div className="search-select__search">
                <FaSearch aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setHighlight(0);
                  }}
                  onKeyDown={onSearchKeyDown}
                />
              </div>
              <div className="search-select__options">
                {filtered.length === 0 ? (
                  <p className="search-select__empty">Nenhuma opção encontrada.</p>
                ) : (
                  filtered.map((option, index) => (
                    <button
                      key={`${option.value}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={option.value === value}
                      disabled={option.disabled}
                      className={`search-select__option${option.value === value ? " is-selected" : ""}${
                        index === highlight ? " is-highlight" : ""
                      }`}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => {
                        if (!option.disabled) choose(option.value);
                      }}
                    >
                      {option.label}
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
