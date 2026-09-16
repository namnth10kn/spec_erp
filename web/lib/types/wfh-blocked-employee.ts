export interface WfhBlockedUserRef {
  id: number;
  full_name: string;
  email: string;
  role?: string | null;
  avatar_url?: string | null;
}

export interface WfhBlockedEmployee {
  id: number;
  employee_id: number;
  employee: WfhBlockedUserRef;
  note?: string | null;
  blocked_by: number;
  blocked_by_user?: WfhBlockedUserRef | null;
  blocked_at: string;
}

export interface CreateWfhBlockedEmployeePayload {
  employee_id: number;
  note?: string;
}

export interface UpdateWfhBlockedEmployeePayload {
  note: string | null;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface WfhBlockedEmployeeListResponse {
  data: WfhBlockedEmployee[];
  pagination: PaginationMeta;
}

export interface Employee extends WfhBlockedUserRef {
  status: "active" | "inactive";
}
