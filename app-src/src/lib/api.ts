// ============================================================
// SIFAU — Cliente HTTP tipado (client-side)
// ============================================================
"use client";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Sem conexão com o servidor. Verifique sua internet.", 0);
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg =
      (body as { error?: string } | null)?.error ??
      "Erro inesperado. Tente novamente.";
    throw new ApiError(msg, res.status);
  }
  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(data ?? {}) });
}

export function apiPatch<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(data ?? {}) });
}

export function apiPut<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body: JSON.stringify(data ?? {}) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
