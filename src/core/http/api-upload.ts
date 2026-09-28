import { appBase } from "@/core/config/app-base";
import { ApiError, messageFromApiError } from "@/core/http/api-error";
import { clearToken, getToken } from "@/core/http/token-storage";

const loginPath = `${appBase}/login`;

export type UploadProgress = {
  /** 0–100 do envio do arquivo. */
  percent: number;
  loaded: number;
  total: number;
};

/**
 * Upload multipart com progresso (XHR). Não define Content-Type — o browser monta o boundary.
 */
export function apiUpload<T>(
  path: string,
  formData: FormData,
  onProgress?: (progress: UploadProgress) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api${path}`);

    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = event.total > 0 ? Math.min(100, Math.round((event.loaded / event.total) * 100)) : 0;
      onProgress?.({ percent, loaded: event.loaded, total: event.total });
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        clearToken();
        if (!window.location.pathname.startsWith(loginPath)) {
          window.location.assign(loginPath);
        }
        reject(new ApiError(401, "Não autorizado"));
        return;
      }
      if (xhr.status === 204) {
        resolve(undefined as T);
        return;
      }
      let data: { error?: unknown } = {};
      try {
        data = JSON.parse(xhr.responseText || "{}") as { error?: unknown };
      } catch {
        data = {};
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError(xhr.status, messageFromApiError(data.error, xhr.status)));
        return;
      }
      resolve(data as T);
    };

    xhr.onerror = () => reject(new ApiError(0, "Falha de rede ao enviar o arquivo"));
    xhr.onabort = () => reject(new ApiError(0, "Envio cancelado"));

    xhr.send(formData);
  });
}
