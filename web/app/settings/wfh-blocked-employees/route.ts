import { NextResponse } from "next/server";
import { addBlocked, delay, getActor, listBlocked } from "@/lib/mock/store";
import {
  getMockRole,
  jsonError,
  readJson,
  requireHr,
  requireSettingsRead,
} from "@/lib/mock/http";
import { parseCreateWfhBlockedEmployee } from "@/lib/validations/wfh-blocked-employee.schema";

export async function GET(request: Request) {
  await delay();
  const role = getMockRole(request);
  const denied = requireSettingsRead(role);
  if (denied) return denied;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  return NextResponse.json(listBlocked({ search, page: Number.isFinite(page) ? page : 1 }));
}

export async function POST(request: Request) {
  await delay();
  const role = getMockRole(request);
  const forbidden = requireHr(role);
  if (forbidden) return forbidden;

  const parsed = parseCreateWfhBlockedEmployee(await readJson(request));
  if (!parsed.ok) {
    return jsonError("VALIDATION_ERROR", parsed.message, 422);
  }

  const result = addBlocked({
    ...parsed.data,
    actorId: getActor(role).id,
  });
  if (!result.ok) {
    if (result.code === "WFH_BLOCK_DUPLICATE") {
      return jsonError("WFH_BLOCK_DUPLICATE", "Nhân viên này đã nằm trong danh sách.", 409);
    }
    return jsonError(
      "WFH_BLOCK_EMPLOYEE_INACTIVE",
      "Không thêm được nhân viên đã nghỉ.",
      422,
    );
  }
  return NextResponse.json(result.row, { status: 201 });
}
