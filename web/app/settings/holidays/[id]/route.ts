import { NextResponse } from "next/server";
import { delay, removeHoliday, updateHoliday } from "@/lib/mock/store";
import { getMockRole, jsonError, readJson, requireHr } from "@/lib/mock/http";
import { parseUpsertHoliday } from "@/lib/validations/holiday.schema";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await delay();
  const role = getMockRole(request);
  const forbidden = requireHr(role);
  if (forbidden) return forbidden;

  const { id } = await context.params;
  const parsed = parseUpsertHoliday(await readJson(request));
  if (!parsed.ok) {
    return jsonError("VALIDATION_ERROR", parsed.message, 422);
  }
  const result = updateHoliday(Number(id), parsed.data);
  if (!result.ok) {
    if (result.code === "HOLIDAY_DUPLICATE") {
      return jsonError("HOLIDAY_DUPLICATE", "Ngày lễ này đã tồn tại.", 409);
    }
    return jsonError("HOLIDAY_NOT_FOUND", "Không tìm thấy ngày lễ.", 404);
  }
  return NextResponse.json(result.holiday);
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
  const ok = removeHoliday(Number(id));
  if (!ok) {
    return jsonError("HOLIDAY_NOT_FOUND", "Không tìm thấy ngày lễ.", 404);
  }
  return new NextResponse(null, { status: 204 });
}
