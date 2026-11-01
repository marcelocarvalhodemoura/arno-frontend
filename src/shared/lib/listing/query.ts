import { fold } from "@/shared/lib/csv/fold";

/** Busca sem diferenciar maiúsculas nem acentos ("andres" acha "ANDRÉS"). */
export function matchesQuery(term: string, fields: Array<string | number | boolean | null | undefined>): boolean {
  const query = fold(term);
  if (!query) return true;
  return fold(fields.filter((field) => field !== null && field !== undefined && field !== "").join(" ")).includes(
    query,
  );
}
