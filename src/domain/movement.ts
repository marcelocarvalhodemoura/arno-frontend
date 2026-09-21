export function foldName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function isUnidentifiedName(name?: string | null) {
  return foldName(name ?? "") === "a identificar";
}

export function isMensalidadeName(name?: string | null) {
  return foldName(name ?? "").includes("mensalidade");
}

export function natureForTypeName(name: string): "fixed" | "variable" {
  const key = foldName(name);
  if (["mensalidade", "ueb / registro", "sede", "utilidades"].includes(key)) return "fixed";
  return "variable";
}
