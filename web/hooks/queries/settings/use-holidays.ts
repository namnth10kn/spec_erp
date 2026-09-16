"use client";

import { api } from "@/lib/api/client";
import { useQuery } from "@/lib/query/client";
import type { Holiday } from "@/lib/types/holiday";

export function useHolidays(year: number) {
  return useQuery({
    queryKey: ["settings", "holidays", year],
    queryFn: () => api<Holiday[]>(`/settings/holidays?year=${year}`),
  });
}
