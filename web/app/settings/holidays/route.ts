import { NextResponse } from "next/server";
import { addHoliday, delay, listHolidays } from "@/lib/mock/store";
import {
  getMockRole,
  jsonError,
  readJson,
  requireHr,
  requireSettingsRead,
} from "@/lib/mock/http";
import { parseUpsertHoliday } from "@/lib/validations/holiday.schema";

export async function GET(request: Request) {
  await delay();
  const role = getMockRole(request);
  const denied = requireSettingsRead(role);
  if (denied) return denied;

  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return jsonError("VALIDATION_ERROR", "Năm không hợp lệ.", 422);
  }
  return NextResponse.json(listHolidays(year));
}

export async function POST(request: Request) {
  await delay();
  const role = getMockRole(request);
  const forbidden = requireHr(role);
  if (forbidden) return forbidden;

  const parsed = parseUpsertHoliday(await readJson(request));
  if (!parsed.ok) {
    return jsonError("VALIDATION_ERROR", parsed.message, 422);
  }
  const result = addHoliday(parsed.data);
  if (!result.ok) {
    return jsonError("HOLIDAY_DUPLICATE", "Ngày lễ này đã tồn tại.", 409);
  }
  return NextResponse.json(result.holiday, { status: 201 });
}
