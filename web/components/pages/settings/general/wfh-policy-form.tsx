"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useUpdateWfhPolicy, useWfhPolicy } from "@/hooks/queries/settings/use-wfh-policy";
import { ApiError } from "@/lib/types/api";
import { messages, weekdayLong, weekdayShort } from "@/lib/i18n/messages";
import { useRole } from "@/lib/mock/role-context";
import type { UpdateWfhPolicyPayload, WfhPolicy } from "@/lib/types/wfh";
import {
  hasPolicyErrors,
  validateUpdateWfhPolicy,
} from "@/lib/validations/wfh-policy.schema";

const WORKDAYS = [1, 2, 3, 4, 5];
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const t = messages.generalSettings;

function toPayload(policy: WfhPolicy): UpdateWfhPolicyPayload {
  return {
    max_days_per_week: policy.max_days_per_week,
    blocked_weekdays: [...policy.blocked_weekdays],
    edit_deadline: { ...policy.edit_deadline },
  };
}

function samePayload(a: UpdateWfhPolicyPayload, b: UpdateWfhPolicyPayload) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function WfhPolicyForm() {
  const { canEdit } = useRole();
  const { data, isLoading, isError, refetch } = useWfhPolicy();
  const update = useUpdateWfhPolicy();
  const toast = useToast();
  const [form, setForm] = useState<UpdateWfhPolicyPayload | null>(null);
  const [baseline, setBaseline] = useState<UpdateWfhPolicyPayload | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    const payload = toPayload(data);
    setForm(payload);
    setBaseline(payload);
    setErrors({});
  }, [data]);

  const dirty = Boolean(form && baseline && !samePayload(form, baseline));
  const remainingDays = useMemo(
    () => WORKDAYS.filter((day) => !form?.blocked_weekdays.includes(day)),
    [form],
  );

  if (isError) {
    return (
      <Card title={t.wfh.sectionTitle}>
        <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{t.errors.loadFailed}</p>
          <Button type="button" onClick={() => void refetch()}>
            {t.actions.retry}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title={t.wfh.sectionTitle}>
      {isLoading || !form ? (
        <p className="text-sm text-zinc-500">{t.common.loading}</p>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canEdit) return;
            const nextErrors = validateUpdateWfhPolicy(form);
            if (hasPolicyErrors(nextErrors)) {
              setErrors({
                max_days_per_week: nextErrors.max_days_per_week ? t.errors.invalidMaxDays : "",
                blocked_weekdays: nextErrors.blocked_weekdays ? t.errors.invalidWeekdays : "",
                edit_deadline: nextErrors.edit_deadline ? t.errors.invalidDeadline : "",
              });
              return;
            }
            try {
              await update.mutateAsync(form);
              toast.push(t.wfh.saved);
            } catch (error) {
              const message =
                error instanceof ApiError && error.code === "WFH_POLICY_FORBIDDEN"
                  ? t.errors.forbidden
                  : t.errors.loadFailed;
              toast.push(message, "error");
            }
          }}
        >
          <Field
            label={t.wfh.blockedWeekdays}
            hint={t.wfh.blockedWeekdaysHint}
            error={errors.blocked_weekdays}
          >
            <div className="flex flex-wrap items-center gap-2">
              {form.blocked_weekdays.map((day) => (
                <span
                  key={day}
                  className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2.5 py-1 text-sm font-medium text-orange-800"
                >
                  {weekdayShort(day)}
                  {canEdit ? (
                    <button
                      type="button"
                      className="rounded-full px-0.5 text-orange-700 hover:bg-orange-100"
                      onClick={() =>
                        setForm({
                          ...form,
                          blocked_weekdays: form.blocked_weekdays.filter((d) => d !== day),
                        })
                      }
                      aria-label={`Gỡ ${weekdayShort(day)}`}
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
              {canEdit && remainingDays.length > 0 ? (
                <div className="relative">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 w-8 px-0"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-label="Thêm thứ"
                  >
                    +
                  </Button>
                  {menuOpen ? (
                    <div className="absolute left-0 top-9 z-10 min-w-28 rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
                      {remainingDays.map((day) => (
                        <button
                          key={day}
                          type="button"
                          className="block w-full px-3 py-1.5 text-left text-sm hover:bg-orange-50"
                          onClick={() => {
                            setForm({
                              ...form,
                              blocked_weekdays: [...form.blocked_weekdays, day].sort(
                                (a, b) => a - b,
                              ),
                            });
                            setMenuOpen(false);
                          }}
                        >
                          {weekdayShort(day)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {form.blocked_weekdays.length === 0 ? (
                <span className="text-sm text-zinc-400">Không có ngày bắt buộc</span>
              ) : null}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t.wfh.lockTime}
              hint={t.wfh.lockTimeHint}
              error={errors.edit_deadline}
            >
              <div className="flex gap-2">
                <Select
                  disabled={!canEdit}
                  invalid={Boolean(errors.edit_deadline)}
                  value={form.edit_deadline.weekday}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      edit_deadline: {
                        ...form.edit_deadline,
                        weekday: Number(event.target.value),
                      },
                    })
                  }
                  aria-label={t.wfh.lockWeekday}
                >
                  {ALL_WEEKDAYS.map((day) => (
                    <option key={day} value={day}>
                      {weekdayLong(day)}
                    </option>
                  ))}
                </Select>
                <Input
                  type="time"
                  disabled={!canEdit}
                  invalid={Boolean(errors.edit_deadline)}
                  value={form.edit_deadline.time}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      edit_deadline: { ...form.edit_deadline, time: event.target.value },
                    })
                  }
                  aria-label={t.wfh.lockClock}
                />
              </div>
            </Field>

            <Field label={t.wfh.maxDays} error={errors.max_days_per_week}>
              <Input
                type="number"
                min={1}
                max={5}
                step={1}
                disabled={!canEdit}
                invalid={Boolean(errors.max_days_per_week)}
                value={form.max_days_per_week}
                onChange={(event) =>
                  setForm({
                    ...form,
                    max_days_per_week: Number(event.target.value),
                  })
                }
              />
            </Field>
          </div>

          {canEdit ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!dirty || update.isPending}
                onClick={() => baseline && setForm(baseline)}
              >
                {t.actions.cancel}
              </Button>
              <Button type="submit" disabled={!dirty || update.isPending}>
                {t.actions.save}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">{t.common.readOnly}</p>
          )}
        </form>
      )}
    </Card>
  );
}
