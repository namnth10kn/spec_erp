import { NextResponse } from "next/server";
import { delay, listEmployees } from "@/lib/mock/store";
import { getMockRole, requireSettingsRead } from "@/lib/mock/http";

export async function GET(request: Request) {
  await delay(80);
  const role = getMockRole(request);
  const denied = requireSettingsRead(role);
  if (denied) return denied;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const status = url.searchParams.get("status");
  return NextResponse.json(
    listEmployees({
      search,
      status: status === "inactive" ? "inactive" : "active",
    }),
  );
}
