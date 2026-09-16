export interface CreateBlockedParsed {
  employee_id: number;
  note?: string;
}

export interface UpdateBlockedParsed {
  note: string | null;
}

export function parseCreateWfhBlockedEmployee(
  body: unknown,
): { ok: true; data: CreateBlockedParsed } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Payload không hợp lệ." };
  }
  const { employee_id, note } = body as Record<string, unknown>;
  if (typeof employee_id !== "number" || !Number.isInteger(employee_id) || employee_id <= 0) {
    return { ok: false, message: "employee_id không hợp lệ." };
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return { ok: false, message: "Ghi chú không hợp lệ." };
  }
  if (typeof note === "string" && note.length > 200) {
    return { ok: false, message: "Ghi chú tối đa 200 ký tự." };
  }
  return {
    ok: true,
    data: {
      employee_id,
      note: typeof note === "string" && note.trim() ? note.trim() : undefined,
    },
  };
}

export function parseUpdateWfhBlockedEmployee(
  body: unknown,
): { ok: true; data: UpdateBlockedParsed } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Payload không hợp lệ." };
  }
  const { note } = body as Record<string, unknown>;
  if (note !== null && typeof note !== "string") {
    return { ok: false, message: "Ghi chú không hợp lệ." };
  }
  if (typeof note === "string" && note.length > 200) {
    return { ok: false, message: "Ghi chú tối đa 200 ký tự." };
  }
  return {
    ok: true,
    data: { note: typeof note === "string" ? (note.trim() || null) : null },
  };
}
