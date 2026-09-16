"use client";

import { QueryClientProvider } from "@/lib/query/client";
import { RoleProvider } from "@/lib/mock/role-context";
import { ToastProvider } from "@/components/ui/toast";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider>
      <RoleProvider>
        <ToastProvider>{children}</ToastProvider>
      </RoleProvider>
    </QueryClientProvider>
  );
}
