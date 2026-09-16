export interface Holiday {
  id: number;
  date: string;
  name: string;
  yearly: boolean;
}

export interface UpsertHolidayPayload {
  date: string;
  name: string;
  yearly?: boolean;
}
