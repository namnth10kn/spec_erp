export interface WfhPolicy {
  max_days_per_week: number;
  min_days_per_week: number;
  blocked_weekdays: number[];
  selectable_weekdays: number[];
  edit_deadline: { weekday: number; time: string };
  blocked_employee_ids: number[];
}

export interface UpdateWfhPolicyPayload {
  max_days_per_week: number;
  blocked_weekdays: number[];
  edit_deadline: { weekday: number; time: string };
}

export type MockRole = "hr" | "ceo" | "staff";
