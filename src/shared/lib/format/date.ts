export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

// Formatadores criados uma vez: toLocale*String com timeZone monta um novo a cada chamada (caro em listas).
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const COMPACT_DATE_TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" });
const TODAY_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return DATE_TIME_FORMAT.format(date).replace(",", " às");
}

export function formatCompactDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return COMPACT_DATE_TIME_FORMAT.format(date).replace(",", "");
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return MONTH_LABEL_FORMAT.format(date);
}

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

let todayCache: { minute: number; value: string } | null = null;

/** Data de hoje (AAAA-MM-DD) em São Paulo. Chamada em cada linha das listas, então guarda o valor por minuto. */
export function todayISO(now?: Date): string {
  if (now) return TODAY_FORMAT.format(now);
  const minute = Math.floor(Date.now() / 60_000);
  if (todayCache?.minute !== minute) todayCache = { minute, value: TODAY_FORMAT.format(new Date()) };
  return todayCache.value;
}
