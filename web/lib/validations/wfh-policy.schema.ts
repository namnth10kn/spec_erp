const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const WORKDAYS = new Set([1, 2, 3, 4, 5]);

export interface PolicyFieldErrors {
  max_days_per_week?: string;
  blocked_weekdays?: string;
  edit_deadline?: string;
}

export function validateUpdateWfhPolicy(payload: {
  max_days_per_week: unknown;
  blocked_weekdays: unknown;
  edit_deadline: unknown;
}): PolicyFieldErrors {
  const errors: PolicyFieldErrors = {};
  const max = payload.max_days_per_week;
  if (
    typeof max !== "number" ||
    !Number.isInteger(max) ||
    max < 1 ||
    max > 5
  ) {
    errors.max_days_per_week = "invalid";
  }

  if (!Array.isArray(payload.blocked_weekdays)) {
    errors.blocked_weekdays = "invalid";
  } else {
    const set = new Set<number>();
    for (const d of payload.blocked_weekdays) {
      if (typeof d !== "number" || !WORKDAYS.has(d) || set.has(d)) {
        errors.blocked_weekdays = "invalid";
        break;
      }
      set.add(d);
    }
  }

  const deadline = payload.edit_deadline as
    | { weekday?: unknown; time?: unknown }
    | null
    | undefined;
  if (
    !deadline ||
    typeof deadline.weekday !== "number" ||
    !Number.isInteger(deadline.weekday) ||
    deadline.weekday < 0 ||
    deadline.weekday > 6 ||
    typeof deadline.time !== "string" ||
    !TIME_RE.test(deadline.time)
  ) {
    errors.edit_deadline = "invalid";
  }

  return errors;
}

export function hasPolicyErrors(errors: PolicyFieldErrors) {
  return Object.keys(errors).length > 0;
}
