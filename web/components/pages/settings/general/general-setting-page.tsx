"use client";

import { HolidaysTable } from "@/components/pages/settings/general/holidays-table";
import { WfhBlockedEmployeesTable } from "@/components/pages/settings/general/wfh-blocked-employees-table";
import { WfhPolicyForm } from "@/components/pages/settings/general/wfh-policy-form";
import { messages } from "@/lib/i18n/messages";
import { useRole } from "@/lib/mock/role-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const t = messages.generalSettings;

export function GeneralSettingPage() {
  const { canView, ready } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (ready && !canView) router.replace("/forbidden");
  }, [canView, ready, router]);

  if (!ready || !canView) return null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{t.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t.common.timezone}</p>
      </div>
      <WfhPolicyForm />
      <WfhBlockedEmployeesTable />
      <HolidaysTable />
    </div>
  );
}
