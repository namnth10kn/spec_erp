"use client";

import { useEffect, useState } from "react";
import { Button, Field, Input } from "@/components/ui/form";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  useCreateHoliday,
  useUpdateHoliday,
} from "@/hooks/queries/settings/use-holiday-mutations";
import { ApiError } from "@/lib/types/api";
import { messages } from "@/lib/i18n/messages";
import type { Holiday } from "@/lib/types/holiday";

const t = messages.generalSettings;

export function HolidayFormDialog({
  open,
  holiday,
  defaultYear,
  onClose,
}: {
  open: boolean;
  holiday: Holiday | null;
  defaultYear: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const create = useCreateHoliday();
  const update = useUpdateHoliday();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [yearly, setYearly] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDate(holiday?.date ?? `${defaultYear}-01-01`);
    setName(holiday?.name ?? "");
    setYearly(holiday?.yearly ?? false);
    setNameError("");
  }, [open, holiday, defaultYear]);

  async function submit() {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      setNameError(t.errors.required);
      return;
    }
    const payload = { date, name: trimmed, yearly };
    try {
      if (holiday) {
        await update.mutateAsync({ id: holiday.id, payload });
        toast.push(t.holidays.updated);
      } else {
        await create.mutateAsync(payload);
        toast.push(t.holidays.added);
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === "HOLIDAY_DUPLICATE") {
        toast.push(t.errors.holidayDuplicate, "error");
        return;
      }
      toast.push(error instanceof Error ? error.message : t.errors.loadFailed, "error");
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      title={holiday ? t.holidays.edit : t.holidays.add}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            {t.actions.cancel}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={pending}>
            {holiday ? t.actions.save : t.actions.add}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t.holidays.date}>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label={t.holidays.name} error={nameError}>
          <Input
            maxLength={100}
            value={name}
            invalid={Boolean(nameError)}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            checked={yearly}
            onChange={(event) => setYearly(event.target.checked)}
          />
          {t.holidays.yearly}
        </label>
      </div>
    </Dialog>
  );
}
