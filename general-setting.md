# Spec — Cấu hình chung

| | |
|---|---|
| **Thuộc module** | `settings` — màn **Cấu hình chung** |
| **Route** | `/settings/general` |
| **Trạng thái tài liệu** | Draft v1 |
| **Ngày tạo** | 2026-09-15 |
| **Spec anh em** | [`requests-wfh-spec.md`](./requests-wfh-spec.md) — đăng ký WFH dùng các giá trị này<br>[`requests-module-spec.md`](./requests-module-spec.md) — đơn nghỉ phép dùng bảng ngày lễ để tính `total_days` |

HR cấu hình chính sách WFH và lịch ngày lễ tại **một màn**. FE Đơn từ / WFH **chỉ đọc**, không hardcode thứ 5, 2 ngày/tuần, hay 23:59 chủ nhật.

---

## 1. Phạm vi

### Trong phạm vi (v1)

| # | Cấu hình | Dùng ở |
|---|---|---|
| 1 | **Ngày bắt buộc lên văn phòng** | Lưới WFH: cột cam, checkbox disable |
| 2 | **Thời gian khoá WFH** | Hạn nhân viên tự tick đăng ký tuần sau |
| 3 | **Số ngày WFH tối đa / tuần** | R2 trên lưới đăng ký |
| 4 | **Ngày nghỉ lễ trong năm** | WFH (R4) + đơn nghỉ phép (`total_days`) |
| 5 | **Danh sách user bị block WFH** | Hàng trên lưới đăng ký khoá như hết hạn |

### Ngoài phạm vi

- Cấu hình khác của ERP (timezone công ty, space Google Chat, …) — ghi nhận khi có spec riêng.
- Hạn mức % quân số phòng ban — **không làm** (đã chốt ở spec WFH).

---

## 2. Ai dùng

| Vai trò | Xem | Sửa |
|---|---|---|
| **HR**  | ✅ | ✅ |
| CEO | ✅ | ❌ (read-only) |
| Còn lại | Không vào được route → `/forbidden` |

Sidebar: mục **Cấu hình chung** chỉ hiện với HR/CEO. Không nhét vào menu Đơn từ.

---

## 3. Màn hình `/settings/general`

Một trang, **ba card**. Nút `Lưu` chỉ trên **card Chính sách WFH**. Ngày lễ và user bị block **CRUD từng dòng**, không gom vào submit policy.

```
┌─ Cấu hình chung ─────────────────────────────────────────┐
│                                                          │
│  ┌─ Chính sách WFH ───────────────────────────────────┐  │
│  │ Ngày bắt buộc lên văn phòng   [ T5 × ] [+]         │  │
│  │ Thời gian khoá WFH            [ Chủ nhật ] [ 23:59 ]│  │
│  │ Số ngày WFH tối đa / tuần     [ 2 ]                 │  │
│  │                              [ Huỷ ]  [ Lưu ]       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Nhân viên không được đăng ký WFH     [ Thêm người ] │
│  │ No  Họ tên              Role   Ghi chú      ⋯        │  │
│  │ 1   NguyenVanA          DEV    —            Xoá      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Ngày nghỉ lễ trong năm  [ 2026 ▾ ]  [ Thêm ngày lễ ]│
│  │ Ngày        Tên              Lặp hàng năm    ⋯       │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

Giờ luôn **Asia/Ho_Chi_Minh**. FE không đoán mặc định khi `GET` lỗi — chặn form, hiện retry.

---

## 4. Chính sách WFH

`GET /wfh/policy` · `PUT /wfh/policy`. Sau `PUT`: invalidate `['wfh']` và `['settings', 'wfh-policy']`. Lưới WFH refetch — không cache cứng.

```ts
export interface WfhPolicy {
  max_days_per_week: number;
  min_days_per_week: number;       // hệ thống = 1, không hiện trên form
  blocked_weekdays: number[];      // ISO: 1 = T2 … 5 = T6
  selectable_weekdays: number[];   // hệ thống = [1,2,3,4,5]
  edit_deadline: { weekday: number; time: string }; // weekday 0=CN … 6=T7; time "HH:mm"
  /** Chỉ GET — aggregate từ bảng block §5. Không gửi lúc PUT policy. */
  blocked_employee_ids: number[];
}

export interface UpdateWfhPolicyPayload {
  max_days_per_week: number;
  blocked_weekdays: number[];
  edit_deadline: { weekday: number; time: string };
}
```

Danh sách user bị block **không** gửi trong `PUT /wfh/policy`. CRUD riêng §5. `GET /wfh/policy` trả `blocked_employee_ids` để lưới WFH khoá hàng.

### 4.1 Ngày bắt buộc lên văn phòng

| | |
|---|---|
| Field | `blocked_weekdays` |
| Mặc định | `[4]` (thứ 5) |
| Control | Multi-select thứ **2 → 6**. Không chọn T7/CN. Trống = không có ngày bắt buộc |
| Preview | Chip cam giống cột lưới WFH |

**Hiệu lực:** cột ngày đó trên lưới WFH nền cam, checkbox disable, tooltip *"Ngày bắt buộc có mặt tại văn phòng"*.

Đổi danh sách **không** tự gỡ WFH đã tick trùng ngày mới bị khoá. BE đánh ngày đó `invalid` trên bản đăng ký + thông báo in-app. Tuần chưa khoá: nhân viên tự bỏ tick. Tuần đã khoá: HR sửa trên lưới.

### 4.2 Thời gian khoá WFH

| | |
|---|---|
| Field | `edit_deadline` |
| Mặc định | `{ weekday: 0, time: "23:59" }` — **23:59 chủ nhật** (trước tuần đăng ký) |
| Control | Select thứ (`Chủ nhật` … `Thứ bảy`) + time `HH:mm` |

**Ý nghĩa:** nhân viên được tự tick WFH cho **tuần kế tiếp** cho tới mốc này (theo giờ VN). Qua mốc → tuần đăng ký khoá: checkbox nhân viên disable; **chỉ HR** còn tick (spec WFH §3.4, §3.6).

Job khoá BE chạy ngay sau mốc (ví dụ mặc định → 00:00 thứ 2) + đánh giá lười khi đọc.

Đổi hạn **không** áp ngược tuần đã khoá. Tuần N+1 đang mở: hạn mới có hiệu lực ngay (countdown trên lưới WFH đọc `edit_deadline_at` do BE tính).

`wfh.deadline_soon` gửi **sáng cùng ngày** với `edit_deadline.weekday` (mặc định sáng chủ nhật).

### 4.3 Số ngày tối đa đăng ký WFH

| | |
|---|---|
| Field | `max_days_per_week` |
| Mặc định | `2` |
| Control | Input number, min **1**, max **5** (số ngày làm việc trong tuần) |

**Hiệu lực:** lưới WFH `Đã chọn n/max`. Tick thêm khi đã đủ → toast, không gọi API.

Hạ `max` xuống dưới số ngày đã đăng ký của tuần **chưa khoá**: không chặn `Lưu`. Lần tick tiếp theo mới bị R2. Tuần đã khoá: HR tự bỏ tick nếu cần.

Không có `min` trên UI (`min_days_per_week = 1` khi còn ≥ 1 ngày được tick; bỏ hết tick = không đăng ký = lên công ty).

### 4.4 Validation lúc Lưu

| Rule | Lỗi |
|---|---|
| `max_days_per_week` ∈ 1–5, integer | Highlight ô |
| `blocked_weekdays` ⊆ `{1,2,3,4,5}`, không trùng | Highlight multi-select |
| `edit_deadline.weekday` ∈ 0–6; `time` khớp `^([01]\d\|2[0-3]):[0-5]\d$` | Highlight |
| Không phải HR | `WFH_POLICY_FORBIDDEN` |

Một `Lưu` ghi **chỉ** 4.1–4.3. Không đụng danh sách user bị block.

---

## 5. Danh sách user bị block WFH

CRUD riêng — **không** nằm trong `Lưu` chính sách. Hiệu lực trên lưới đăng ký: spec WFH §3.2.3 (hàng khoá như hết hạn; HR vẫn tick được).

```ts
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
  note?: string | null;          // tuỳ chọn, ≤ 200 ký tự
  blocked_by: number;
  blocked_by_user?: WfhBlockedUserRef | null;
  blocked_at: string;            // ISO datetime
}

export interface CreateWfhBlockedEmployeePayload {
  employee_id: number;
  note?: string;
}

export interface UpdateWfhBlockedEmployeePayload {
  note: string | null;           // sửa ghi chú; không đổi người
}
```

### 5.1 Read — bảng

Empty: minh hoạ + CTA `Thêm người`. Có dữ liệu:

`No` · `Họ tên` (avatar) · `Role` · `Ghi chú` · `Người khoá` · `Thời điểm` · ⋯

- Sort mặc định: `blocked_at` desc.
- Ô tìm trên card: lọc theo tên / email, debounce 400ms (client hoặc `search` query).
- Phân trang nếu > 20 dòng.

### 5.2 Create — thêm người

Nút `Thêm người` → dialog:

1. Combobox nhân viên **active**, tìm tên/email. **Loại** người đã có trong list.
2. `Ghi chú` — optional.
3. `Huỷ` · `Thêm` (primary).

Không chọn được chính user HR đang thao tác? **Được** — HR tự block vẫn override được trên lưới.  
Không thêm user inactive / đã nghỉ — combobox chỉ active.  
Trùng `employee_id` → `WFH_BLOCK_DUPLICATE`, không tạo dòng thứ hai.

`POST` thành công: đóng dialog, prepend hàng, invalidate `['wfh']` + `['settings', 'wfh-blocked']`. Hàng trên lưới WFH khoá **ngay**. Đơn `late_wfh` pending của người đó bị huỷ (WFH H7).

### 5.3 Update — sửa ghi chú

Menu ⋯ → `Sửa ghi chú` → dialog chỉ ô note. Không đổi `employee_id`. `PATCH`.

### 5.4 Delete — gỡ block

Menu ⋯ → `Xoá` → confirm *"Người này sẽ đăng ký WFH được lại theo hạn tuần."*

`DELETE` thành công: gỡ hàng, invalidate như Create. Trên lưới WFH: hàng mở lại theo quy tắc tuần (N+1 chưa khoá → tự tick được). **Không** xoá lịch WFH đã có.

### 5.5 Quyền

Chỉ **HR** C/U/D. CEO xem bảng, ẩn `Thêm người` và menu ⋯.

---

## 6. Ngày nghỉ lễ trong năm

Bảng dùng chung toàn ERP. **Không** nhét vào `WfhPolicy`.

WFH: `GET /wfh/weeks` resolve `blocked_reason = 'holiday'` + `holiday_name`.  
Đơn nghỉ: BE loại ngày lễ khỏi `total_days`.

```ts
export interface Holiday {
  id: number;
  date: string;     // ISO "2026-09-02"
  name: string;     // "Quốc khánh"
  yearly: boolean;  // true → lặp mỗi năm (so tháng-ngày)
}

export interface UpsertHolidayPayload {
  date: string;
  name: string;
  yearly?: boolean; // mặc định false
}
```

### 6.1 UI

- Bộ lọc **Năm** trên đầu bảng. Mặc định = năm dương lịch hiện tại.
- Bảng: `Ngày` · `Tên` · `Lặp hàng năm` · ⋯ (`Sửa` / `Xoá`).
- `Thêm ngày lễ` → dialog: date picker, tên (bắt buộc, 1–100 ký tự), checkbox **Lặp hàng năm**.
- Năm đang lọc: hiện ngày lễ **của năm đó**, cộng các bản `yearly` (hiển thị với năm đang xem, ví dụ 01/01/2026).
- Xoá có confirm. Xoá bản `yearly` gỡ mọi năm, không chỉ năm đang xem — copy dialog phải nói rõ.

### 6.2 Trùng

Cùng một `date` (ISO), hoặc `yearly` trùng **tháng-ngày** với một `yearly` khác → `HOLIDAY_DUPLICATE`.

### 6.3 Hiệu lực WFH

Cột ngày lễ trên lưới: checkbox disable, nền hồng nhạt, tooltip `Nghỉ lễ: {name}`. Không tính vào `max_days_per_week`.

Công bố lễ **sau** khi đã có người tick ngày đó: BE `invalid` + in-app. Chưa khoá tuần → nhân viên tự sửa. Đã khoá → HR sửa lưới.

Sau mỗi CRUD: invalidate `['settings', 'holidays']` và `['wfh']`.

---

## 7. API

| Method | Endpoint | Payload | Response | Ai |
|---|---|---|---|---|
| GET | `/wfh/policy` | — | `WfhPolicy` (kèm `blocked_employee_ids`) | User có quyền WFH hoặc Cấu hình chung |
| PUT | `/wfh/policy` | `UpdateWfhPolicyPayload` | `WfhPolicy` | **HR** — không gồm block list |
| GET | `/settings/wfh-blocked-employees` | `search?` `page?` | `WfhBlockedEmployee[]` + pagination | HR/CEO |
| POST | `/settings/wfh-blocked-employees` | `CreateWfhBlockedEmployeePayload` | `WfhBlockedEmployee` | **HR** |
| PATCH | `/settings/wfh-blocked-employees/:id` | `UpdateWfhBlockedEmployeePayload` | `WfhBlockedEmployee` | **HR** |
| DELETE | `/settings/wfh-blocked-employees/:id` | — | `void` | **HR** |
| GET | `/settings/holidays` | `year?: number` | `Holiday[]` | HR/CEO; BE WFH/leave đọc nội bộ |
| POST | `/settings/holidays` | `UpsertHolidayPayload` | `Holiday` | **HR** |
| PUT | `/settings/holidays/:id` | `UpsertHolidayPayload` | `Holiday` | **HR** |
| DELETE | `/settings/holidays/:id` | — | `void` | **HR** |

`:id` của block list là **id dòng**, không phải `employee_id`.

`GET /settings/holidays?year=2026` trả bản để render năm đó (ngày cố định trong 2026 + yearly expand `date` sang 2026).

| Code | Khi nào |
|---|---|
| `WFH_POLICY_FORBIDDEN` | Không phải HR gọi PUT policy / CRUD holiday / CRUD block |
| `WFH_POLICY_INVALID` | Payload §4.4 |
| `WFH_BLOCK_DUPLICATE` | `employee_id` đã có trong list |
| `WFH_BLOCK_NOT_FOUND` | PATCH/DELETE id không còn |
| `WFH_BLOCK_EMPLOYEE_INACTIVE` | Thêm user inactive / đã nghỉ |
| `HOLIDAY_DUPLICATE` | Trùng ngày / trùng yearly tháng-ngày |
| `HOLIDAY_NOT_FOUND` | Sửa/xoá holiday id không còn |

---

## 8. Frontend

```
app/[locale]/(protected)/settings/general/
└── page.tsx

components/pages/settings/general/
├── general-setting-page.tsx
├── wfh-policy-form.tsx
├── wfh-blocked-employees-table.tsx
├── wfh-blocked-employee-dialog.tsx   # Thêm người / sửa ghi chú
├── holidays-table.tsx
└── holiday-form-dialog.tsx

lib/types/wfh.ts                 # WfhPolicy — dùng chung spec WFH
lib/types/holiday.ts
lib/types/wfh-blocked-employee.ts
lib/validations/wfh-blocked-employee.schema.ts
hooks/queries/settings/
├── use-wfh-policy.ts
├── use-wfh-blocked-employees.ts
├── use-wfh-blocked-employee-mutations.ts
├── use-holidays.ts
└── use-holiday-mutations.ts
```

React Query: `['wfh', 'policy']` · `['settings', 'wfh-blocked', params]` · `['settings', 'holidays', year]`.

Sau C/U/D block: invalidate `['settings', 'wfh-blocked']` **và** `['wfh']`.

---

## 9. i18n

```jsonc
"generalSettings": {
  "title": "Cấu hình chung",
  "wfh": {
    "sectionTitle": "Chính sách WFH",
    "blockedWeekdays": "Ngày bắt buộc lên văn phòng",
    "blockedWeekdaysHint": "Các thứ này không đăng ký WFH được.",
    "lockTime": "Thời gian khoá WFH",
    "lockTimeHint": "Hết mốc này, nhân viên không tự đăng ký tuần sau được. Chỉ HR còn sửa.",
    "lockWeekday": "Thứ",
    "lockClock": "Giờ",
    "maxDays": "Số ngày WFH tối đa mỗi tuần"
  },
  "blockedUsers": {
    "sectionTitle": "Nhân viên không được đăng ký WFH",
    "add": "Thêm người",
    "searchPlaceholder": "Tìm nhân viên",
    "note": "Ghi chú",
    "blockedBy": "Người khoá",
    "blockedAt": "Thời điểm",
    "editNote": "Sửa ghi chú",
    "remove": "Xoá",
    "removeConfirm": "Người này sẽ đăng ký WFH được lại theo hạn tuần.",
    "empty": "Chưa khoá ai. Nhân viên vẫn tự đăng ký WFH được."
  },
  "holidays": {
    "sectionTitle": "Ngày nghỉ lễ trong năm",
    "year": "Năm",
    "date": "Ngày",
    "name": "Tên ngày lễ",
    "yearly": "Lặp hàng năm",
    "add": "Thêm ngày lễ",
    "deleteConfirm": "Xoá ngày lễ này?",
    "deleteYearlyConfirm": "Đây là ngày lễ lặp hàng năm. Xoá sẽ gỡ khỏi mọi năm."
  },
  "actions": { "save": "Lưu", "cancel": "Huỷ" },
  "errors": {
    "forbidden": "Chỉ HR được sửa cấu hình chung.",
    "holidayDuplicate": "Ngày lễ này đã tồn tại.",
    "blockDuplicate": "Nhân viên này đã nằm trong danh sách.",
    "loadFailed": "Không tải được cấu hình. Thử lại."
  }
}
```

Nhãn thứ trên form: T2–T7, CN — lấy `messages`, không hardcode.

---

## 10. Trường hợp biên

| Tình huống | Xử lý |
|---|---|
| `GET /wfh/policy` lỗi | Chặn form, retry. Không fill 2 / thứ 5 / 23:59 CN. |
| Hạ max từ 2 → 1 khi ai đó đã tick 2 ngày tuần chưa khoá | Cho lưu. Tick tiếp theo mới chặn. |
| Đổi khoá từ CN 23:59 → T6 18:00 trong khi đang là chủ nhật 20:00 | Tuần N+1 khoá ngay (đã qua hạn mới). Job + lazy lock. |
| Đổi khoá sang giờ *trong tương lai* của tuần N | Mở lại tick cho tuần N+1 nếu BE coi tuần đó chưa lock. |
| Thêm lễ trùng ngày đã WFH | `invalid` + thông báo; không tự xoá ô. |
| Hai HR lưu policy cùng lúc | Lần sau thắng. |
| Thêm user đã có trong list | `WFH_BLOCK_DUPLICATE`; dialog không đóng. |
| HR xoá user khỏi list khi họ đang mở lưới WFH | Refetch; checkbox hàng đó enable lại nếu tuần N+1 chưa khoá. |
| Thêm user đang có đơn sau hạn pending | Tạo block thành công; BE huỷ đơn (WFH H7). |
| CEO bấm Thêm người | Nút ẩn; API `WFH_POLICY_FORBIDDEN`. |

---

## 11. Liên kết spec WFH

Lưới đăng ký đọc policy/holiday từ đây. Không copy form cấu hình vào `/requests/wfh`.

| Spec WFH | Nguồn |
|---|---|
| R2 max ngày | §4.3 |
| R3 cột cam | §4.1 |
| R4 ngày lễ | §6 |
| Hạn sửa / job khoá tuần | §4.2 |
| Hàng user bị block | §5 · WFH §3.2.3 |
