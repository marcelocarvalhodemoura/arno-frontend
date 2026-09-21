export function stampAuthor(author?: { name: string; username?: string } | null): string {
  if (author?.username) return `@${author.username}`;
  const name = author?.name?.trim() || "Carga inicial";
  const parts = name.split(/\s+/);
  if (parts.length > 2) return parts[0];
  return name;
}

export function originShort(origin?: string): string {
  if (origin === "manual") return "Manual";
  if (origin === "sicredi") return "Sicredi";
  return "Integração";
}

export function methodLabel(method: string): string {
  const map: Record<string, string> = {
    pix: "Pix",
    cash: "Dinheiro",
    transfer: "Transferência",
    card: "Cartão",
    other: "Outro",
  };
  return map[method] ?? method;
}

export function natureLabel(nature: string): string {
  return nature === "fixed" ? "Fixa" : "Variável";
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    jovem: "Jovem",
    escotista: "Escotista",
    dirigente: "Dirigente",
    clube: "Clube",
  };
  return map[role] ?? role;
}

export function yesNo(value: boolean): string {
  return value ? "Sim" : "Não";
}

export function holderKindLabel(kind: string): string {
  const map: Record<string, string> = {
    parent: "Pai / mãe",
    youth: "Jovem",
    other: "Outro",
  };
  return map[kind] ?? kind;
}

export function originLabel(origin?: string): string {
  if (origin === "manual") return "Inserção manual";
  if (origin === "sicredi") return "Sicredi";
  return "Integração";
}

export function auditAction(updatedAt?: string, createdAt?: string): "Alterado" | "Lançado" {
  return updatedAt && updatedAt !== createdAt ? "Alterado" : "Lançado";
}

export function directionLabel(direction: string): string {
  const map: Record<string, string> = {
    income: "Entrada",
    expense: "Saída",
    both: "Entrada e saída",
  };
  return map[direction] ?? direction;
}

export function typeLabel(type: string): string {
  return type === "income" ? "Entrada" : "Saída";
}
