"use client";

import { api } from "@/lib/api/client";
import { useMutation, useQueryClient } from "@/lib/query/client";
import type { Holiday, UpsertHolidayPayload } from "@/lib/types/holiday";

async function invalidateHolidays(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries(["settings", "holidays"]);
  await queryClient.invalidateQueries(["wfh"]);
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertHolidayPayload) =>
      api<Holiday>("/settings/holidays", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateHolidays(queryClient),
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; payload: UpsertHolidayPayload }) =>
      api<Holiday>(`/settings/holidays/${input.id}`, {
        method: "PUT",
        body: JSON.stringify(input.payload),
      }),
    onSuccess: () => invalidateHolidays(queryClient),
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/settings/holidays/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateHolidays(queryClient),
  });
}
