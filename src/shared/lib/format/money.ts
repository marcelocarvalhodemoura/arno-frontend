const BRL_FORMAT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function brl(value: number): string {
  return BRL_FORMAT.format(value);
}

export function chartMoney(value: unknown): string {
  return brl(Number(value ?? 0));
}

export function signedClass(value: number): string {
  if (value > 0) return "is-pos";
  if (value < 0) return "is-neg";
  return "";
}
