"use client";

import { api } from "@/lib/api/client";
import { useQuery } from "@/lib/query/client";
import type { Employee } from "@/lib/types/wfh-blocked-employee";

export function useActiveEmployees(search: string, enabled: boolean) {
  return useQuery({
    queryKey: ["settings", "employees", "active", search],
    queryFn: () => {
      const qs = new URLSearchParams({ status: "active" });
      if (search) qs.set("search", search);
      return api<Employee[]>(`/employees?${qs.toString()}`);
    },
    enabled,
  });
}
