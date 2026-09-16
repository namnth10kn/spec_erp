import { ApiError, type ApiErrorCode } from "@/lib/types/api";
import { getStoredRole } from "@/lib/mock/role";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const role = getStoredRole();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("x-mock-role", role);

  const res = await fetch(path, { ...init, headers });
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!res.ok) {
    throw new ApiError(
      (body.code as ApiErrorCode) ?? "VALIDATION_ERROR",
      (body.message as string) ?? "Yêu cầu thất bại.",
      res.status,
      body.fields as Record<string, string> | undefined,
    );
  }

  return body as T;
}
