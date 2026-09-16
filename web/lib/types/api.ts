export type ApiErrorCode =
  | "WFH_POLICY_FORBIDDEN"
  | "WFH_POLICY_INVALID"
  | "WFH_BLOCK_DUPLICATE"
  | "WFH_BLOCK_NOT_FOUND"
  | "WFH_BLOCK_EMPLOYEE_INACTIVE"
  | "HOLIDAY_DUPLICATE"
  | "HOLIDAY_NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION_ERROR";

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  fields?: Record<string, string>;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}
