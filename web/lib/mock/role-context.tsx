"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getStoredRole, setStoredRole } from "@/lib/mock/role";
import type { MockRole } from "@/lib/types/wfh";

interface RoleContextValue {
  role: MockRole;
  setRole: (role: MockRole) => void;
  canEdit: boolean;
  canView: boolean;
  ready: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<MockRole>("hr");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRoleState(getStoredRole());
    setReady(true);
  }, []);

  const setRole = useCallback((next: MockRole) => {
    setStoredRole(next);
    setRoleState(next);
  }, []);

  const value = useMemo(
    () => ({
      role,
      setRole,
      canEdit: role === "hr",
      canView: role === "hr" || role === "ceo",
      ready,
    }),
    [role, setRole, ready],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("RoleProvider is required");
  return ctx;
}
