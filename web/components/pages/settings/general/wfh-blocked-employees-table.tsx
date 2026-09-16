"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { WfhBlockedEmployeeDialog } from "@/components/pages/settings/general/wfh-blocked-employee-dialog";
import { useWfhBlockedEmployees } from "@/hooks/queries/settings/use-wfh-blocked-employees";
import { useDeleteWfhBlockedEmployee } from "@/hooks/queries/settings/use-wfh-blocked-employee-mutations";
import { useWfhPolicy } from "@/hooks/queries/settings/use-wfh-policy";
import { formatDateTime, initials, useDebouncedValue } from "@/lib/format";
import { messages } from "@/lib/i18n/messages";
import { useRole } from "@/lib/mock/role-context";
import type { WfhBlockedEmployee } from "@/lib/types/wfh-blocked-employee";

const t = messages.generalSettings;

export function WfhBlockedEmployeesTable() {
  const { canEdit } = useRole();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<
    | { mode: "create" }
    | { mode: "edit"; row: WfhBlockedEmployee }
    | { mode: "delete"; row: WfhBlockedEmployee }
    | null
  >(null);
  const debouncedSearch = useDebouncedValue(search, 400);
  const list = useWfhBlockedEmployees({ search: debouncedSearch, page });
  const policy = useWfhPolicy();
  const remove = useDeleteWfhBlockedEmployee();
  const toast = useToast();
  const rows = list.data?.data ?? [];
  const pagination = list.data?.pagination;
  const excludedIds = policy.data?.blocked_employee_ids ?? rows.map((row) => row.employee_id);

  return (
    <Card
      title={t.blockedUsers.sectionTitle}
      action={
        canEdit ? (
          <Button type="button" onClick={() => setDialog({ mode: "create" })}>
            {t.blockedUsers.add}
          </Button>
        ) : null
      }
    >
      <div className="mb-4">
        <Input
          placeholder={t.blockedUsers.searchPlaceholder}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {list.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{t.errors.loadFailed}</p>
          <Button type="button" variant="secondary" onClick={() => void list.refetch()}>
            {t.actions.retry}
          </Button>
        </div>
      ) : list.isLoading ? (
        <p className="text-sm text-zinc-500">{t.common.loading}</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
            ⌀
          </div>
          <p className="max-w-sm text-sm text-zinc-600">{t.blockedUsers.empty}</p>
          {canEdit ? (
            <Button type="button" onClick={() => setDialog({ mode: "create" })}>
              {t.blockedUsers.add}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-3 font-medium">{t.blockedUsers.no}</th>
                  <th className="py-2 pr-3 font-medium">{t.blockedUsers.name}</th>
                  <th className="py-2 pr-3 font-medium">{t.blockedUsers.role}</th>
                  <th className="py-2 pr-3 font-medium">{t.blockedUsers.note}</th>
                  <th className="py-2 pr-3 font-medium">{t.blockedUsers.blockedBy}</th>
                  <th className="py-2 pr-3 font-medium">{t.blockedUsers.blockedAt}</th>
                  {canEdit ? <th className="py-2 font-medium" /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-3 text-zinc-500">
                      {((pagination?.page ?? 1) - 1) * (pagination?.per_page ?? 20) + index + 1}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">
                          {initials(row.employee.full_name)}
                        </span>
                        <span>
                          <span className="block font-medium text-zinc-900">
                            {row.employee.full_name}
                          </span>
                          <span className="block text-xs text-zinc-500">{row.employee.email}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-zinc-700">{row.employee.role ?? "—"}</td>
                    <td className="py-3 pr-3 text-zinc-700">{row.note || "—"}</td>
                    <td className="py-3 pr-3 text-zinc-700">
                      {row.blocked_by_user?.full_name ?? "—"}
                    </td>
                    <td className="py-3 pr-3 text-zinc-700">{formatDateTime(row.blocked_at)}</td>
                    {canEdit ? (
                      <td className="relative py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 w-8 px-0"
                          onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                          aria-label="Thao tác"
                        >
                          ⋯
                        </Button>
                        {menuId === row.id ? (
                          <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-zinc-200 bg-white py-1 text-left shadow-lg">
                            <button
                              type="button"
                              className="block w-full px-3 py-1.5 text-sm hover:bg-zinc-50"
                              onClick={() => {
                                setMenuId(null);
                                setDialog({ mode: "edit", row });
                              }}
                            >
                              {t.blockedUsers.editNote}
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setMenuId(null);
                                setDialog({ mode: "delete", row });
                              }}
                            >
                              {t.blockedUsers.remove}
                            </button>
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.total > pagination.per_page ? (
            <div className="mt-4 flex items-center justify-end gap-2 text-sm">
              <span className="text-zinc-500">
                {t.common.page} {pagination.page} {t.common.of} {pagination.total_pages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </Button>
            </div>
          ) : null}
        </>
      )}

      <WfhBlockedEmployeeDialog
        open={dialog?.mode === "create" || dialog?.mode === "edit"}
        mode={dialog?.mode === "edit" ? "edit" : "create"}
        editing={dialog?.mode === "edit" ? dialog.row : null}
        excludedIds={excludedIds}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.mode === "delete"}
        title={t.blockedUsers.remove}
        message={t.blockedUsers.removeConfirm}
        confirmLabel={t.blockedUsers.remove}
        danger
        pending={remove.isPending}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.mode !== "delete") return;
          try {
            await remove.mutateAsync(dialog.row.id);
            toast.push(t.blockedUsers.removed);
            setDialog(null);
          } catch (error) {
            toast.push(error instanceof Error ? error.message : t.errors.loadFailed, "error");
          }
        }}
      />
    </Card>
  );
}
