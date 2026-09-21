export function matchesQuery(term: string, fields: Array<string | number | boolean | null | undefined>): boolean {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  return fields
    .filter((field) => field !== null && field !== undefined && field !== "")
    .join(" ")
    .toLowerCase()
    .includes(query);
}
