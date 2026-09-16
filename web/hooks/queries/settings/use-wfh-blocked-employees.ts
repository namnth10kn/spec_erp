"use client";

import { api } from "@/lib/api/client";
import { useQuery } from "@/lib/query/client";
import type { WfhBlockedEmployeeListResponse } from "@/lib/types/wfh-blocked-employee";

export function useWfhBlockedEmployees(params: { search: string; page: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();

  return useQuery({
    queryKey: ["settings", "wfh-blocked", params],
    queryFn: () =>
      api<WfhBlockedEmployeeListResponse>(
        `/settings/wfh-blocked-employees${qs ? `?${qs}` : ""}`,
      ),
  });
}
