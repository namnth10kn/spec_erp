"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Field, Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useActiveEmployees } from "@/hooks/queries/settings/use-employees";
import {
  useCreateWfhBlockedEmployee,
  useUpdateWfhBlockedEmployee,
} from "@/hooks/queries/settings/use-wfh-blocked-employee-mutations";
import { ApiError } from "@/lib/types/api";
import { useDebouncedValue } from "@/lib/format";
import { messages } from "@/lib/i18n/messages";
import type { WfhBlockedEmployee } from "@/lib/types/wfh-blocked-employee";

const t = messages.generalSettings;

export function WfhBlockedEmployeeDialog({
  open,
  mode,
  editing,
  excludedIds,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  editing?: WfhBlockedEmployee | null;
  excludedIds: number[];
  onClose: () => void;
}) {
  const toast = useToast();
  const create = useCreateWfhBlockedEmployee();
  const update = useUpdateWfhBlockedEmployee();
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const employees = useActiveEmployees(debouncedSearch, open && mode === "create");

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setEmployeeId(null);
    setNote(editing?.note ?? "");
    setListOpen(false);
  }, [open, editing]);

  const options = useMemo(
    () => (employees.data ?? []).filter((emp) => !excludedIds.includes(emp.id)),
    [employees.data, excludedIds],
  );
  const selected = options.find((emp) => emp.id === employeeId);

  async function submit() {
    try {
      if (mode === "create") {
        if (!employeeId) return;
        await create.mutateAsync({
          employee_id: employeeId,
          note: note.trim() || undefined,
        });
        toast.push(t.blockedUsers.added);
        onClose();
        return;
      }
      if (!editing) return;
      await update.mutateAsync({
        id: editing.id,
        payload: { note: note.trim() || null },
      });
      toast.push(t.blockedUsers.updated);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === "WFH_BLOCK_DUPLICATE") {
        toast.push(t.errors.blockDuplicate, "error");
        return;
      }
      toast.push(
        error instanceof ApiError ? error.message : t.errors.loadFailed,
        "error",
      );
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      title={mode === "create" ? t.blockedUsers.addTitle : t.blockedUsers.editTitle}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            {t.actions.cancel}
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={pending || (mode === "create" && !employeeId)}
          >
            {mode === "create" ? t.actions.add : t.actions.save}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {mode === "create" ? (
          <Field label={t.blockedUsers.employee}>
            <div className="relative">
              <input
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none ring-blue-600/30 focus:ring-2"
                placeholder={t.blockedUsers.employeePlaceholder}
                value={selected && !listOpen ? `${selected.full_name} · ${selected.email}` : search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setEmployeeId(null);
                  setListOpen(true);
                }}
                onFocus={() => setListOpen(true)}
              />
              {listOpen ? (
                <div className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg">
                  {employees.isLoading ? (
                    <p className="px-3 py-2 text-sm text-zinc-500">{t.common.loading}</p>
                  ) : options.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-zinc-500">{t.common.noResults}</p>
                  ) : (
                    options.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-zinc-50"
                        onClick={() => {
                          setEmployeeId(emp.id);
                          setSearch(emp.full_name);
                          setListOpen(false);
                        }}
                      >
                        <span className="block text-sm font-medium text-zinc-900">
                          {emp.full_name}
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {emp.email}
                          {emp.role ? ` · ${emp.role}` : ""}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </Field>
        ) : (
          <p className="text-sm text-zinc-700">
            {editing?.employee.full_name} · {editing?.employee.email}
          </p>
        )}
        <Field label={t.blockedUsers.note}>
          <Textarea
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  );
}
