"use client";

import { useState } from "react";
import { Button, Card, Select } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/dialog";
import { HolidayFormDialog } from "@/components/pages/settings/general/holiday-form-dialog";
import { useToast } from "@/components/ui/toast";
import { useHolidays } from "@/hooks/queries/settings/use-holidays";
import { useDeleteHoliday } from "@/hooks/queries/settings/use-holiday-mutations";
import { formatDate } from "@/lib/format";
import { messages } from "@/lib/i18n/messages";
import { useRole } from "@/lib/mock/role-context";
import type { Holiday } from "@/lib/types/holiday";

const t = messages.generalSettings;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 2 + i);

export function HolidaysTable() {
  const { canEdit } = useRole();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [form, setForm] = useState<{ open: boolean; holiday: Holiday | null }>({
    open: false,
    holiday: null,
  });
  const [removing, setRemoving] = useState<Holiday | null>(null);
  const list = useHolidays(year);
  const remove = useDeleteHoliday();
  const toast = useToast();
  const rows = list.data ?? [];

  return (
    <Card
      title={t.holidays.sectionTitle}
      action={
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            {t.holidays.year}
            <Select
              className="w-24"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {YEARS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>
          {canEdit ? (
            <Button type="button" onClick={() => setForm({ open: true, holiday: null })}>
              {t.holidays.add}
            </Button>
          ) : null}
        </div>
      }
    >
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
        <p className="py-8 text-center text-sm text-zinc-500">Chưa có ngày lễ trong năm {year}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-3 font-medium">{t.holidays.date}</th>
                <th className="py-2 pr-3 font-medium">{t.holidays.name}</th>
                <th className="py-2 pr-3 font-medium">{t.holidays.yearly}</th>
                {canEdit ? <th className="py-2 font-medium" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="py-3 pr-3">
                    <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-800">
                      {formatDate(row.date)}
                    </span>
                  </td>
                  <td className="py-3 pr-3 font-medium text-zinc-900">{row.name}</td>
                  <td className="py-3 pr-3 text-zinc-700">{row.yearly ? "Có" : "Không"}</td>
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
                        <div className="absolute right-0 z-10 mt-1 w-32 rounded-md border border-zinc-200 bg-white py-1 text-left shadow-lg">
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-sm hover:bg-zinc-50"
                            onClick={() => {
                              setMenuId(null);
                              setForm({ open: true, holiday: row });
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setMenuId(null);
                              setRemoving(row);
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
      )}

      <HolidayFormDialog
        open={form.open}
        holiday={form.holiday}
        defaultYear={year}
        onClose={() => setForm({ open: false, holiday: null })}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        title="Xoá ngày lễ"
        message={
          removing?.yearly ? t.holidays.deleteYearlyConfirm : t.holidays.deleteConfirm
        }
        confirmLabel={t.blockedUsers.remove}
        danger
        pending={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await remove.mutateAsync(removing.id);
            toast.push(t.holidays.removed);
            setRemoving(null);
          } catch (error) {
            toast.push(error instanceof Error ? error.message : t.errors.loadFailed, "error");
          }
        }}
      />
    </Card>
  );
}
