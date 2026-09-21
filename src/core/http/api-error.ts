export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function messageFromApiError(error: unknown, status: number): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const payload = error as { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> };
    const fields = Object.values(payload.fieldErrors ?? {})
      .flat()
      .filter(Boolean);
    const form = (payload.formErrors ?? []).filter(Boolean);
    const first = [...form, ...fields][0];
    if (first) return first;
  }
  return `Erro ${status}`;
}
