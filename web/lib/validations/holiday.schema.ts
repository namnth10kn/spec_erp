const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface UpsertHolidayParsed {
  date: string;
  name: string;
  yearly: boolean;
}

export function parseUpsertHoliday(
  body: unknown,
): { ok: true; data: UpsertHolidayParsed } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Payload không hợp lệ." };
  }
  const { date, name, yearly } = body as Record<string, unknown>;
  if (typeof date !== "string" || !DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00+07:00`))) {
    return { ok: false, message: "Ngày không hợp lệ." };
  }
  if (typeof name !== "string") {
    return { ok: false, message: "Tên ngày lễ bắt buộc." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    return { ok: false, message: "Tên ngày lễ từ 1 đến 100 ký tự." };
  }
  if (yearly !== undefined && typeof yearly !== "boolean") {
    return { ok: false, message: "yearly không hợp lệ." };
  }
  return {
    ok: true,
    data: { date, name: trimmed, yearly: yearly === true },
  };
}

export function monthDay(isoDate: string) {
  return isoDate.slice(5);
}

export function withYear(isoDate: string, year: number) {
  return `${year}-${isoDate.slice(5)}`;
}

export function yearOf(isoDate: string) {
  return Number(isoDate.slice(0, 4));
}
