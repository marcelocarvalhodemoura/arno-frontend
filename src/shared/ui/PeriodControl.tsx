import { FaCalendarAlt } from "react-icons/fa";
import { MONTHS } from "@/shared/lib/format";
import type { Period } from "@/shared/hooks/use-period";
import SearchableSelect from "@/shared/ui/SearchableSelect";

const YEARS = [2025, 2026, 2027];

const MONTH_OPTIONS = [
  { value: "0", label: "Ano todo" },
  ...MONTHS.map((monthLabel, index) => ({ value: String(index + 1), label: monthLabel })),
];

const YEAR_OPTIONS = YEARS.map((y) => ({ value: String(y), label: String(y) }));

export function periodDisplayLabel(year: number, month: number) {
  return month ? `${MONTHS[month - 1]} · ${year}` : `Ano todo · ${year}`;
}

/** Controlo destacado na topbar — período global do sistema. */
export default function PeriodControl({ year, month, setYear, setMonth }: Period) {
  const label = periodDisplayLabel(year, month);

  return (
    <div className="period-control" role="group" aria-label="Período de consulta">
      <div className="period-control__badge">
        <span className="period-control__icon" aria-hidden>
          <FaCalendarAlt />
        </span>
        <div className="period-control__text">
          <span className="period-control__kicker">Período</span>
          <strong className="period-control__value">{label}</strong>
        </div>
      </div>
      <div className="period-control__fields">
        <label className="period-control__field">
          <span>Mês</span>
          <SearchableSelect
            value={String(month)}
            onChange={(value) => setMonth(Number(value))}
            aria-label="Mês do período"
            placeholder="Mês"
            options={MONTH_OPTIONS}
          />
        </label>
        <label className="period-control__field">
          <span>Ano</span>
          <SearchableSelect
            value={String(year)}
            onChange={(value) => setYear(Number(value))}
            aria-label="Ano do período"
            placeholder="Ano"
            options={YEAR_OPTIONS}
          />
        </label>
      </div>
    </div>
  );
}

/** Espelho do período nas barras de filtro das páginas. */
export function PeriodField({ year, month, setYear, setMonth }: Period) {
  return (
    <label className="field field--period">
      <span>Período do sistema</span>
      <div className="period-field-row">
        <SearchableSelect
          value={String(month)}
          onChange={(value) => setMonth(Number(value))}
          aria-label="Mês do período"
          placeholder="Mês"
          options={MONTH_OPTIONS}
        />
        <SearchableSelect
          value={String(year)}
          onChange={(value) => setYear(Number(value))}
          aria-label="Ano do período"
          placeholder="Ano"
          options={YEAR_OPTIONS}
        />
      </div>
    </label>
  );
}
