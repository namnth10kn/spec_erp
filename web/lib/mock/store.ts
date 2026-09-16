import type { Holiday } from "@/lib/types/holiday";
import type { MockRole, WfhPolicy } from "@/lib/types/wfh";
import type {
  Employee,
  WfhBlockedEmployee,
  WfhBlockedUserRef,
} from "@/lib/types/wfh-blocked-employee";
import { monthDay, withYear, yearOf } from "@/lib/validations/holiday.schema";

const ACTORS: Record<MockRole, WfhBlockedUserRef> = {
  hr: {
    id: 100,
    full_name: "Lan Nguyen",
    email: "lan.nguyen@company.com",
    role: "HR",
    avatar_url: null,
  },
  ceo: {
    id: 1,
    full_name: "Nam Tran",
    email: "nam.tran@company.com",
    role: "CEO",
    avatar_url: null,
  },
  staff: {
    id: 2,
    full_name: "An Le",
    email: "an.le@company.com",
    role: "DEV",
    avatar_url: null,
  },
};

const EMPLOYEES: Employee[] = [
  { ...ACTORS.ceo, status: "active" },
  { ...ACTORS.staff, status: "active" },
  {
    id: 3,
    full_name: "Nguyen Van A",
    email: "nguyenvana@company.com",
    role: "DEV",
    avatar_url: null,
    status: "active",
  },
  {
    id: 4,
    full_name: "Tran Thi B",
    email: "tranthib@company.com",
    role: "QA",
    avatar_url: null,
    status: "active",
  },
  {
    id: 5,
    full_name: "Le Van C",
    email: "levanc@company.com",
    role: "BA",
    avatar_url: null,
    status: "active",
  },
  {
    id: 6,
    full_name: "Pham Thi D",
    email: "phamthid@company.com",
    role: "HR",
    avatar_url: null,
    status: "active",
  },
  {
    id: 7,
    full_name: "Hoang Van E",
    email: "hoangvane@company.com",
    role: "DEV",
    avatar_url: null,
    status: "inactive",
  },
  {
    id: 8,
    full_name: "Do Thi F",
    email: "dothif@company.com",
    role: "PM",
    avatar_url: null,
    status: "active",
  },
  {
    id: 9,
    full_name: "Bui Van G",
    email: "buivang@company.com",
    role: "DEV",
    avatar_url: null,
    status: "active",
  },
  { ...ACTORS.hr, status: "active" },
];

interface Store {
  policy: Omit<WfhPolicy, "blocked_employee_ids">;
  blocked: WfhBlockedEmployee[];
  holidays: Holiday[];
  nextBlockId: number;
  nextHolidayId: number;
}

function seed(): Store {
  return {
    policy: {
      max_days_per_week: 2,
      min_days_per_week: 1,
      blocked_weekdays: [4],
      selectable_weekdays: [1, 2, 3, 4, 5],
      edit_deadline: { weekday: 0, time: "23:59" },
    },
    blocked: [
      {
        id: 1,
        employee_id: 3,
        employee: toRef(EMPLOYEES.find((e) => e.id === 3)!),
        note: "Remote không ổn định",
        blocked_by: 100,
        blocked_by_user: ACTORS.hr,
        blocked_at: "2026-09-10T09:15:00+07:00",
      },
      {
        id: 2,
        employee_id: 9,
        employee: toRef(EMPLOYEES.find((e) => e.id === 9)!),
        note: null,
        blocked_by: 100,
        blocked_by_user: ACTORS.hr,
        blocked_at: "2026-09-12T14:02:00+07:00",
      },
    ],
    holidays: [
      { id: 1, date: "2026-01-01", name: "Tết Dương lịch", yearly: true },
      { id: 2, date: "2026-04-30", name: "Ngày Giải phóng miền Nam", yearly: true },
      { id: 3, date: "2026-05-01", name: "Quốc tế Lao động", yearly: true },
      { id: 4, date: "2026-09-02", name: "Quốc khánh", yearly: true },
      { id: 5, date: "2026-09-07", name: "Nghỉ bù Quốc khánh", yearly: false },
    ],
    nextBlockId: 3,
    nextHolidayId: 6,
  };
}

const g = globalThis as typeof globalThis & { __erpGeneralSettings?: Store };

function db(): Store {
  if (!g.__erpGeneralSettings) {
    g.__erpGeneralSettings = seed();
  }
  return g.__erpGeneralSettings;
}

function toRef(employee: Employee): WfhBlockedUserRef {
  const { status: _status, ...ref } = employee;
  return ref;
}

export function getActor(role: MockRole) {
  return ACTORS[role];
}

export function listEmployees(params: { search?: string; status?: "active" | "inactive" }) {
  const q = params.search?.trim().toLowerCase() ?? "";
  return EMPLOYEES.filter((e) => {
    if (params.status && e.status !== params.status) return false;
    if (!q) return true;
    return (
      e.full_name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
    );
  });
}

export function getEmployee(id: number) {
  return EMPLOYEES.find((e) => e.id === id);
}

export function getPolicy(): WfhPolicy {
  const { policy, blocked } = db();
  return {
    ...policy,
    blocked_employee_ids: blocked.map((b) => b.employee_id),
  };
}

export function updatePolicy(
  patch: {
    max_days_per_week: number;
    blocked_weekdays: number[];
    edit_deadline: { weekday: number; time: string };
  },
): WfhPolicy {
  const store = db();
  store.policy = {
    ...store.policy,
    max_days_per_week: patch.max_days_per_week,
    blocked_weekdays: [...patch.blocked_weekdays].sort((a, b) => a - b),
    edit_deadline: { ...patch.edit_deadline },
  };
  return getPolicy();
}

export function listBlocked(params: { search?: string; page?: number; perPage?: number }) {
  const store = db();
  const q = params.search?.trim().toLowerCase() ?? "";
  const filtered = store.blocked
    .filter((row) => {
      if (!q) return true;
      return (
        row.employee.full_name.toLowerCase().includes(q) ||
        row.employee.email.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.blocked_at < b.blocked_at ? 1 : -1));

  const perPage = params.perPage ?? 20;
  const page = Math.max(1, params.page ?? 1);
  const total = filtered.length;
  const start = (page - 1) * perPage;
  return {
    data: filtered.slice(start, start + perPage),
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
    },
  };
}

export function addBlocked(input: {
  employee_id: number;
  note?: string;
  actorId: number;
}): { ok: true; row: WfhBlockedEmployee } | { ok: false; code: "WFH_BLOCK_DUPLICATE" | "WFH_BLOCK_EMPLOYEE_INACTIVE" } {
  const employee = getEmployee(input.employee_id);
  if (!employee || employee.status !== "active") {
    return { ok: false, code: "WFH_BLOCK_EMPLOYEE_INACTIVE" };
  }
  const store = db();
  if (store.blocked.some((b) => b.employee_id === input.employee_id)) {
    return { ok: false, code: "WFH_BLOCK_DUPLICATE" };
  }
  const actor = Object.values(ACTORS).find((a) => a.id === input.actorId) ?? ACTORS.hr;
  const row: WfhBlockedEmployee = {
    id: store.nextBlockId++,
    employee_id: employee.id,
    employee: toRef(employee),
    note: input.note ?? null,
    blocked_by: actor.id,
    blocked_by_user: actor,
    blocked_at: new Date().toISOString(),
  };
  store.blocked.unshift(row);
  return { ok: true, row };
}

export function updateBlockedNote(id: number, note: string | null) {
  const row = db().blocked.find((b) => b.id === id);
  if (!row) return null;
  row.note = note;
  return row;
}

export function removeBlocked(id: number) {
  const store = db();
  const index = store.blocked.findIndex((b) => b.id === id);
  if (index === -1) return false;
  store.blocked.splice(index, 1);
  return true;
}

export function listHolidays(year: number): Holiday[] {
  return db()
    .holidays
    .filter((h) => h.yearly || yearOf(h.date) === year)
    .map((h) => (h.yearly ? { ...h, date: withYear(h.date, year) } : { ...h }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function holidayDuplicate(payload: { date: string; yearly: boolean; excludeId?: number }) {
  return db().holidays.some((h) => {
    if (h.id === payload.excludeId) return false;
    if (h.date === payload.date) return true;
    if (payload.yearly && h.yearly && monthDay(h.date) === monthDay(payload.date)) {
      return true;
    }
    return false;
  });
}

export function addHoliday(payload: { date: string; name: string; yearly: boolean }) {
  if (holidayDuplicate(payload)) return { ok: false as const };
  const store = db();
  const holiday: Holiday = {
    id: store.nextHolidayId++,
    date: payload.date,
    name: payload.name,
    yearly: payload.yearly,
  };
  store.holidays.push(holiday);
  return { ok: true as const, holiday };
}

export function updateHoliday(
  id: number,
  payload: { date: string; name: string; yearly: boolean },
) {
  const holiday = db().holidays.find((h) => h.id === id);
  if (!holiday) return { ok: false as const, code: "HOLIDAY_NOT_FOUND" as const };
  if (holidayDuplicate({ ...payload, excludeId: id })) {
    return { ok: false as const, code: "HOLIDAY_DUPLICATE" as const };
  }
  holiday.date = payload.date;
  holiday.name = payload.name;
  holiday.yearly = payload.yearly;
  return { ok: true as const, holiday };
}

export function removeHoliday(id: number) {
  const store = db();
  const index = store.holidays.findIndex((h) => h.id === id);
  if (index === -1) return false;
  store.holidays.splice(index, 1);
  return true;
}

export function delay(ms = 180) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
