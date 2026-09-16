import { NextResponse } from "next/server";
import type { ApiErrorBody, ApiErrorCode } from "@/lib/types/api";
import type { MockRole } from "@/lib/types/wfh";

export function getMockRole(request: Request): MockRole {
  const header = request.headers.get("x-mock-role");
  if (header === "hr" || header === "ceo" || header === "staff") return header;
  return "hr";
}

export function jsonError(
  code: ApiErrorCode,
  message: string,
  status: number,
  fields?: Record<string, string>,
) {
  const body: ApiErrorBody = { code, message, fields };
  return NextResponse.json(body, { status });
}

export function requireSettingsRead(role: MockRole) {
  if (role === "hr" || role === "ceo") return null;
  return jsonError("FORBIDDEN", "Không có quyền xem cấu hình chung.", 403);
}

export function requireHr(role: MockRole) {
  if (role === "hr") return null;
  return jsonError(
    "WFH_POLICY_FORBIDDEN",
    "Chỉ HR được sửa cấu hình chung.",
    403,
  );
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
