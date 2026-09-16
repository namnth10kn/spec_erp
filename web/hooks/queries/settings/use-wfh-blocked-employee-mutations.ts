"use client";

import { api } from "@/lib/api/client";
import { useMutation, useQueryClient } from "@/lib/query/client";
import type {
  CreateWfhBlockedEmployeePayload,
  UpdateWfhBlockedEmployeePayload,
  WfhBlockedEmployee,
} from "@/lib/types/wfh-blocked-employee";

async function invalidateBlockLists(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries(["settings", "wfh-blocked"]);
  await queryClient.invalidateQueries(["wfh"]);
}

export function useCreateWfhBlockedEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWfhBlockedEmployeePayload) =>
      api<WfhBlockedEmployee>("/settings/wfh-blocked-employees", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateBlockLists(queryClient),
  });
}

export function useUpdateWfhBlockedEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; payload: UpdateWfhBlockedEmployeePayload }) =>
      api<WfhBlockedEmployee>(`/settings/wfh-blocked-employees/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify(input.payload),
      }),
    onSuccess: () => invalidateBlockLists(queryClient),
  });
}

export function useDeleteWfhBlockedEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/settings/wfh-blocked-employees/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateBlockLists(queryClient),
  });
}
