import { NextResponse } from "next/server";
import { delay, removeBlocked, updateBlockedNote } from "@/lib/mock/store";
import { getMockRole, jsonError, readJson, requireHr } from "@/lib/mock/http";
import { parseUpdateWfhBlockedEmployee } from "@/lib/validations/wfh-blocked-employee.schema";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await delay();
  const role = getMockRole(request);
  const forbidden = requireHr(role);
  if (forbidden) return forbidden;

  const { id } = await context.params;
  const rowId = Number(id);
  const parsed = parseUpdateWfhBlockedEmployee(await readJson(request));
  if (!parsed.ok) {
    return jsonError("VALIDATION_ERROR", parsed.message, 422);
  }
  const row = updateBlockedNote(rowId, parsed.data.note);
  if (!row) {
    return jsonError("WFH_BLOCK_NOT_FOUND", "Không tìm thấy dòng khoá.", 404);
  }
  return NextResponse.json(row);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await delay();
  const role = getMockRole(request);
  const forbidden = requireHr(role);
  if (forbidden) return forbidden;

  const { id } = await context.params;
  const ok = removeBlocked(Number(id));
  if (!ok) {
    return jsonError("WFH_BLOCK_NOT_FOUND", "Không tìm thấy dòng khoá.", 404);
  }
  return new NextResponse(null, { status: 204 });
}
