import { appBase } from "@/core/config/app-base";
import { ApiError, messageFromApiError } from "@/core/http/api-error";
import { clearToken, getToken } from "@/core/http/token-storage";

const loginPath = `${appBase}/login`;

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    if (!window.location.pathname.startsWith(loginPath)) {
      window.location.assign(loginPath);
    }
    throw new ApiError(401, "Não autorizado");
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: unknown };
  if (!res.ok) {
    throw new ApiError(res.status, messageFromApiError(data.error, res.status));
  }
  return data as T;
}
