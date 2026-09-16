"use client";

import { Button } from "@/components/ui/form";
import { messages } from "@/lib/i18n/messages";
import { useRole } from "@/lib/mock/role-context";
import Link from "next/link";

const t = messages.generalSettings;

export default function ForbiddenPage() {
  const { setRole } = useRole();
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold text-zinc-900">{t.forbidden.title}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t.forbidden.body}</p>
      <div className="mt-6 flex justify-center gap-2">
        <Button type="button" onClick={() => setRole("hr")}>
          Đổi sang HR
        </Button>
        <Link
          href="/settings/general"
          className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-sm"
        >
          {t.forbidden.back}
        </Link>
      </div>
    </div>
  );
}
