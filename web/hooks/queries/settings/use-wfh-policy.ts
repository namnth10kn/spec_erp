"use client";

import { api } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@/lib/query/client";
import type { UpdateWfhPolicyPayload, WfhPolicy } from "@/lib/types/wfh";

export function useWfhPolicy() {
  return useQuery({
    queryKey: ["wfh", "policy"],
    queryFn: () => api<WfhPolicy>("/wfh/policy"),
  });
}

export function useUpdateWfhPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateWfhPolicyPayload) =>
      api<WfhPolicy>("/wfh/policy", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(["wfh"]);
      await queryClient.invalidateQueries(["settings", "wfh-policy"]);
    },
  });
}
