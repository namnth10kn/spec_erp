"use client";

import { messages } from "@/lib/i18n/messages";
import { useRole } from "@/lib/mock/role-context";
import type { MockRole } from "@/lib/types/wfh";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const t = messages.generalSettings;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role, setRole, canView } = useRole();

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            {t.nav.appName}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{t.nav.settings}</p>
        </div>
        <nav className="flex-1 px-3 py-3">
          {canView ? (
            <Link
              href="/settings/general"
              className={
                pathname.includes("/settings/general")
                  ? "block rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800"
                  : "block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              }
            >
              {t.nav.general}
            </Link>
          ) : (
            <p className="px-3 py-2 text-sm text-zinc-400">{t.nav.general}</p>
          )}
        </nav>
        <div className="border-t border-zinc-100 px-4 py-4">
          <label className="block text-xs font-medium text-zinc-500">{t.roles.label}</label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as MockRole)}
          >
            <option value="hr">{t.roles.hr}</option>
            <option value="ceo">{t.roles.ceo}</option>
            <option value="staff">{t.roles.staff}</option>
          </select>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-zinc-100 px-6 py-8">{children}</main>
    </div>
  );
}
