import { NextResponse } from "next/server";
import { getPolicy, updatePolicy, delay } from "@/lib/mock/store";
import { getMockRole, jsonError, readJson, requireHr } from "@/lib/mock/http";
import {
  hasPolicyErrors,
  validateUpdateWfhPolicy,
} from "@/lib/validations/wfh-policy.schema";

export async function GET() {
  await delay();
  return NextResponse.json(getPolicy());
}

export async function PUT(request: Request) {
  await delay();
  const role = getMockRole(request);
  const forbidden = requireHr(role);
  if (forbidden) return forbidden;

  const body = await readJson(request);
  const errors = validateUpdateWfhPolicy(body ?? {});
  if (hasPolicyErrors(errors)) {
    return jsonError(
      "WFH_POLICY_INVALID",
      "Payload chính sách WFH không hợp lệ.",
      422,
      errors as Record<string, string>,
    );
  }

  const payload = body as {
    max_days_per_week: number;
    blocked_weekdays: number[];
    edit_deadline: { weekday: number; time: string };
  };
  return NextResponse.json(updatePolicy(payload));
}
