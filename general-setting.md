# Spec — Cấu hình chung

| | |
|---|---|
| **Thuộc module** | `settings` — màn **Cấu hình chung** |
| **Route** | `/settings/general` |
| **Trạng thái tài liệu** | Draft v4 |
| **Ngày tạo** | 2026-09-15 |
| **Cập nhật** | 2026-09-16 — hệ số OT **tách hai phần**: trả lương và chuyển thành **phép OT** §9.1, §9.5 |
| **Spec anh em** | [`requests-wfh-spec.md`](./requests-wfh-spec.md) — đăng ký WFH dùng các giá trị này<br>[`requests-module-spec.md`](./requests-module-spec.md) — đơn nghỉ phép dùng bảng ngày lễ để tính `total_days`, và dùng §7 để tính quỹ phép<br>[`requests-ot-spec.md`](./requests-ot-spec.md) — đơn OT dùng §9 để tính hệ số và cảnh báo |

HR cấu hình chính sách WFH, chính sách phép năm, chính sách OT và lịch ngày lễ tại **một màn**. FE Đơn từ / WFH / OT **chỉ đọc**, không hardcode thứ 5, 2 ngày/tuần, 23:59 chủ nhật, 12 ngày phép, hay hệ số 150%.

## 1. Phạm vi

### Trong phạm vi (v1)

| # | Cấu hình | Dùng ở |
|---|---|---|
| 1 | **Ngày bắt buộc lên văn phòng** | Lưới WFH: cột cam, checkbox disable |
| 2 | **Thời gian khoá WFH** | Hạn nhân viên tự tick đăng ký tuần sau |
| 3 | **Số ngày WFH tối đa / tuần** | R2 trên lưới đăng ký |
| 4 | **Ngày nghỉ lễ trong năm** | WFH (R4) + đơn nghỉ phép (`total_days`) |
| 5 | **Danh sách user bị block WFH** | Hàng trên lưới đăng ký khoá như hết hạn |
| 6 | **Mốc reset năm phép** (ngày/tháng + giờ) | Job đóng năm phép cũ, mở năm mới |
| 7 | **Cộng phép tháng** | Quỹ phép năm của từng nhân viên tăng dần theo tháng |
| 8 | **Bậc thâm niên** — bảng `số năm làm việc → số ngày cộng thêm` | Cộng một lần tại mốc reset |
| 10 | **Hệ số OT** theo loại ngày | Giờ quy đổi của mỗi đơn OT |
| 13 | **Phần hệ số trả bằng lương** (`paid_percent`) | Tách giờ OT thành phần lương và phần phép OT |
| 14 | **Quỹ phép OT** (read-only) | Nguồn cho đơn nghỉ bù `compensatory_leave` |

### Ngoài phạm vi

- Cấu hình khác của ERP (timezone công ty, space Google Chat, …) — ghi nhận khi có spec riêng.
- Hạn mức % quân số phòng ban — **không làm** (đã chốt ở spec WFH).
- **Số giờ một ngày công** — chưa cấu hình ở v1. Hệ quả: đơn nghỉ phép năm theo giờ chưa quy đổi chính xác sang ngày phép, xem §7.5 và câu hỏi cần chốt ở §15.
- **HR sửa tay số dư phép của một người** (mua lại phép, ngoại lệ) — ledger §7.7 đã có sẵn loại `manual_adjustment` để không phải migrate về sau, nhưng endpoint và UI để v2.
- **Chính sách phép theo từng nhân viên / từng cấp bậc** — v1 một chính sách áp cho toàn công ty; khác biệt duy nhất giữa người này người kia là **số năm làm việc**.
- **Phụ cấp OT ban đêm** (22:00–06:00) và **trần giờ OT theo năm** — chưa có ở v1; xem [`requests-ot-spec.md`](./requests-ot-spec.md) §11 câu 2 và 3.

---

## 2. Ai dùng

| Vai trò | Xem | Sửa |
|---|---|---|
| **HR**  | ✅ | ✅ |
| CEO | ✅ | ❌ (read-only) |
| Còn lại | Không vào được route → `/forbidden` |

Sidebar: mục **Cấu hình chung** chỉ hiện với HR/CEO. Không nhét vào menu Đơn từ.

---

## 3. Màn hình `/requests/settings`

Một trang, **sáu card**. Nút `Lưu` riêng trên **card Chính sách WFH**, **card Chính sách phép năm** và **card Chính sách OT** — ba policy độc lập, lưu cái này không đụng cái kia. Ngày lễ và user bị block **CRUD từng dòng**, không gom vào submit policy. Card số dư phép **read-only**, không có nút Lưu.

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
│  ┌─ Chính sách phép năm ──────────────────────────────┐  │
│  │ Reset năm phép      [ 01 ▾ ] / [ 01 ▾ ]  [ 00:00 ] │  │
│  │ Cộng phép mỗi tháng [ 1.0 ] ngày, vào ngày [ 01 ▾ ]│  │
│  │ Tháng vào làm       cộng đủ nếu vào trước [ 15 ▾ ] │  │
│  │ Bậc thâm niên                                       │  │
│  │   Từ [ 5 ] năm  → + [ 1 ] ngày            [ Xoá ]  │  │
│  │   Từ [ 10] năm  → + [ 2 ] ngày            [ Xoá ]  │  │
│  │   Từ [ 15] năm  → + [ 3 ] ngày            [ Xoá ]  │  │
│  │                                    [ + Thêm bậc ]  │  │
│  │ ⚠ Phép chưa dùng bị xoá khi tới mốc reset.          │  │
│  │ Lần cộng tới: 01/10/2026 · Reset: 01/01/2027 00:00  │  │
│  │                              [ Huỷ ]  [ Lưu ]       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Chính sách OT ────────────────────────────────────┐  │
│  │ Hệ số OT     Ngày thường  [ 150 ] %                 │  │
│  │              Cuối tuần    [ 200 ] %                 │  │
│  │              Ngày lễ      [ 300 ] %                 │  │
│  │ Trả bằng lương            [ 100 ] %                 │  │
│  │   → ngày thường 100% lương + 50% phép OT            │  │
│  │   → cuối tuần   100% lương + 100% phép OT           │  │
│  │   → ngày lễ     100% lương + 200% phép OT           │  │
│  │ ⚠ Đổi hệ số chỉ áp cho đơn chưa duyệt.              │  │
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

## 7. Chính sách phép năm

`GET /settings/leave-policy` · `PUT /settings/leave-policy`. Sau `PUT`: invalidate `['settings', 'leave-policy']` và `['requests', 'leave-balance']`.

**Một chính sách cho toàn công ty.** Khác biệt duy nhất giữa hai nhân viên là **số năm làm việc** (§7.3). Không có chính sách riêng theo phòng ban / cấp bậc ở v1.

```ts
export interface LeavePolicy {
  /** Mốc reset năm phép. Luôn giờ Asia/Ho_Chi_Minh. */
  reset: {
    month: number;   // 1–12
    day: number;     // 1–28 (xem §7.1 vì sao không cho 29–31)
    time: string;    // "HH:mm"
  };
  /** Số ngày phép cộng mỗi tháng. Bước 0.5. */
  monthly_accrual_days: number;
  /** Cộng vào ngày mấy của tháng (1–28). Giờ dùng chung `reset.time`. */
  monthly_accrual_day: number;
  /** Vào làm từ ngày này trở về trước thì tháng đó vẫn được cộng đủ (§7.2). */
  first_month_cutoff_day: number;
  /**
   * Bảng bậc thâm niên: `số năm làm việc` → `số ngày phép cộng thêm` (§7.3).
   * Sort tăng dần theo `from_years`. Mảng rỗng = không thưởng thâm niên.
   */
  seniority_tiers: SeniorityTier[];

  /** Chỉ GET — BE tính sẵn, FE hiện dòng trạng thái dưới form. */
  next_accrual_at?: string | null;
  next_reset_at?: string | null;
}

export interface SeniorityTier {
  /** Làm việc **từ** bao nhiêu năm trở lên thì áp bậc này. Integer ≥ 0. */
  from_years: number;
  /** Số ngày phép cộng thêm cho cả năm phép. Bội của 0.5, ≥ 0. */
  bonus_days: number;
}

export interface UpdateLeavePolicyPayload {
  reset: { month: number; day: number; time: string };
  monthly_accrual_days: number;
  monthly_accrual_day: number;
  first_month_cutoff_day: number;
  /** Gửi **toàn bộ** bảng bậc mỗi lần Lưu — xem §7.3 vì sao không CRUD từng dòng. */
  seniority_tiers: SeniorityTier[];
}
```

**Mặc định khi khởi tạo hệ thống** — khớp Bộ luật Lao động VN (12 ngày/năm, +1 ngày mỗi 5 năm):

| Field | Mặc định |
|---|---|
| `reset` | `{ month: 1, day: 1, time: "00:00" }` |
| `monthly_accrual_days` | `1` |
| `monthly_accrual_day` | `1` |
| `first_month_cutoff_day` | `15` |
| `seniority_tiers` | `[{ from_years: 5, bonus_days: 1 }, { from_years: 10, bonus_days: 2 }, { from_years: 15, bonus_days: 3 }]` |

Đây là seed của BE, **không** phải giá trị FE tự fill khi `GET` lỗi (§13).

### 7.1 Mốc reset năm phép

| | |
|---|---|
| Field | `reset` |
| Mặc định | `01/01` lúc `00:00` |
| Control | Select tháng + select ngày + time `HH:mm` |

**Ngày chỉ cho 1–28.** Chọn 29–31 sẽ có năm không tồn tại ngày đó (hoặc phải định nghĩa "lùi về ngày cuối tháng"), và một mốc reset chạy lệch ngày giữa các năm là thứ rất khó đối chiếu khi có tranh chấp về số ngày phép. Cùng lý do cho `monthly_accrual_day`.

**Năm phép (`leave_year`)** là số năm dương lịch của **ngày bắt đầu** kỳ phép. Reset `01/01` → năm phép 2026 chạy 01/01/2026 → 31/12/2026. Reset `01/04` → năm phép 2026 chạy 01/04/2026 → 31/03/2027.

**Job reset** chạy đúng mốc và làm ba việc theo thứ tự:

1. Chốt năm phép cũ: ghi một dòng ledger `reset` cho từng nhân viên với `days = -remaining_days` (số phép bị xoá, §7.4), `balance_after = 0`.
2. **Chốt quỹ phép OT**: ghi một dòng `OvertimeLeaveLedgerEntry` loại `reset` với `minutes = -remaining_minutes`, số dư về `0` (§9.5).
3. Mở năm phép mới: `leave_year += 1`, cả hai số dư về `0`.
4. Chạy luôn **lượt cộng phép của tháng đầu tiên** (§7.2) và **thưởng thâm niên** của năm mới (§7.3). Quỹ phép OT **không** có lượt cộng tự động — nó chỉ tăng khi CEO duyệt một đơn OT.

Bước 4 quan trọng: nếu chỉ reset về 0 rồi đợi job cộng phép tháng chạy riêng, sẽ có một khoảng nhân viên mở ERP và thấy quỹ phép **bằng 0** dù vừa sang năm mới. Quỹ phép OT thì đúng là về 0 và ở lại 0 cho tới đơn OT tiếp theo — đó là bản chất của nó.

Đổi mốc reset **không** áp ngược: năm phép đang chạy giữ nguyên ngày kết thúc cũ; mốc mới có hiệu lực từ kỳ sau. FE hiện rõ `next_reset_at` để HR thấy hệ quả trước khi Lưu.

### 7.2 Cộng phép tháng

| | |
|---|---|
| Field | `monthly_accrual_days` · `monthly_accrual_day` · `first_month_cutoff_day` |
| Mặc định | `1` ngày, vào ngày `1`, cutoff ngày `15` |
| Control | Input number (min `0`, max `5`, bước `0.5`) + select ngày 1–28 + select ngày 1–28 |

**Đây là cơ chế chính.** Quỹ phép **tăng dần theo tháng**, không cấp trọn gói đầu năm. Hệ quả phải nói rõ trên UI cho nhân viên: tháng 3 thì chỉ có 3 ngày phép, không phải 12.

Job cộng phép chạy `monthly_accrual_day` hằng tháng lúc `reset.time`, cộng `monthly_accrual_days` cho **mọi nhân viên `work_status = working`**, ghi ledger `monthly_accrual`.

**Tháng vào làm** — `first_month_cutoff_day` quyết định người mới có được cộng phép tháng đó hay không:

| `actual_start_working_date` | Tháng vào làm |
|---|---|
| ≤ `first_month_cutoff_day` | Cộng **đủ** `monthly_accrual_days` |
| > `first_month_cutoff_day` | **Không** cộng; tính từ tháng sau |

Dùng mốc cắt thay vì prorate theo số ngày thực làm để quỹ phép luôn là bội của `0.5` — số phép lẻ kiểu `0.71` ngày không có nghĩa gì khi nghỉ và chỉ gây tranh cãi. BE lấy `actual_start_working_date`, thiếu thì rơi về `start_working_date` (`EmployeeWorkInfo`).

**Tháng nghỉ việc:** không cộng phép của tháng nhân viên `end_working_date` rơi vào, kể cả nghỉ ngày cuối tháng. Phép của một tháng là phần thưởng cho tháng **đã làm trọn**, và việc thanh toán phép chưa dùng khi nghỉ việc nằm ngoài phạm vi ERP v1.

**Ví dụ** — `monthly_accrual_days = 1`, cutoff `15`, năm phép 2026 (reset 01/01):

| Nhân viên | Vào làm | Số lượt cộng trong 2026 | Phép từ cộng tháng |
|---|---|---|---|
| Đã làm từ 2019 | 10/03/2019 | 12 | 12 |
| Vào 08/07/2026 | 08/07/2026 | tháng 7 → 12 = 6 | 6 |
| Vào 20/07/2026 | 20/07/2026 | tháng 8 → 12 = 5 | 5 |

### 7.3 Cộng phép năm — bảng bậc thâm niên

| | |
|---|---|
| Field | `seniority_tiers` |
| Mặc định | `5 năm → +1` · `10 năm → +2` · `15 năm → +3` |
| Control | Bảng dòng lặp trong card: `Từ [ n ] năm → + [ d ] ngày`, nút `Thêm bậc` + nút xoá từng dòng |

Cộng **một lần cho cả năm phép**, tại mốc reset (§7.1 bước 3), ghi ledger `seniority_bonus`. Đây là **phần cộng thêm** trên số phép từ cộng phép tháng (§7.2), không phải tổng quỹ.

**Cách tra bậc — bậc thang, lấy bậc cao nhất đạt được:**

```
seniority_years = số năm trọn vẹn từ actual_start_working_date tới mốc reset
tier            = bậc có from_years LỚN NHẤT mà from_years <= seniority_years
bonus           = tier ? tier.bonus_days : 0
```

Thâm niên thấp hơn `from_years` của bậc nhỏ nhất → bonus `0`. **Không nội suy** giữa hai bậc: thâm niên 7 năm với bảng `5 → +1`, `10 → +2` thì được `+1`, không phải `+1.4`. Bảng là bậc thang, không phải đường thẳng.

**Bảng bậc là trần tự nhiên — không cần field "trần thưởng".** Một công thức kiểu `floor(năm / 5) × 1 ngày` sẽ cộng mãi và phải có field chặn riêng cho người làm 40 năm. Bảng bậc thì bậc cuối cùng chính là mức tối đa: HR muốn chặn ở đâu thì dừng thêm bậc ở đó.

**Bảng gửi trọn gói trong `PUT /settings/leave-policy`**, không CRUD từng dòng như ngày lễ (§6) hay danh sách block (§5). Lý do: một bảng bậc lưu dở dang thì vô nghĩa — xoá bậc `5 năm` mà chưa kịp thêm bậc thay thế sẽ khiến cả nhóm nhân viên tụt về `0` ngày thưởng ngay lập tức. Bảng nhỏ (thực tế 3–5 dòng) nên gửi cả cũng không tốn gì.

`seniority_tiers = []` → không ai được thưởng thâm niên; quỹ phép chỉ còn phần cộng tháng. Hợp lệ, không cần cảnh báo.

Nhân viên vào làm **giữa năm phép** không được thưởng thâm niên cho năm đó (mốc reset đã qua trước khi họ vào); lượt đầu tiên của họ là mốc reset kế tiếp.

**Ví dụ** — bảng mặc định (`5 → +1`, `10 → +2`, `15 → +3`), cộng phép tháng `1` ngày, vào làm `10/03/2019`, mốc reset `01/01`:

| Năm phép | Thâm niên tại mốc reset | Bậc áp dụng | Thưởng | Cộng tháng | **Tổng cả năm** |
|---|---|---|---|---|---|
| 2023 | 3 năm | (không khớp bậc nào) | 0 | 12 | **12** |
| 2025 | 5 năm | `từ 5 năm` | +1 | 12 | **13** |
| 2026 | 6 năm | `từ 5 năm` | +1 | 12 | **13** |
| 2030 | 10 năm | `từ 10 năm` | +2 | 12 | **14** |
| 2036 | 16 năm | `từ 15 năm` | +3 | 12 | **15** |
| 2045 | 25 năm | `từ 15 năm` (bậc cuối) | +3 | 12 | **15** |

### 7.4 Phép chưa dùng — xoá khi reset

**Đã chốt: không chuyển phép tồn sang năm sau.** Tới mốc reset, số dư còn lại về `0`, ledger ghi một dòng `reset` với `days` âm để vẫn tra được ai mất bao nhiêu ngày.

**Quỹ phép OT cũng bị xoá tại cùng mốc này** (§9.5). Đây là chỗ cần nhắc mạnh hơn cả phép năm: phép OT là phần công sức nhân viên đã bỏ ra và chưa quy thành tiền, nên mất nó là mất thật. Người làm OT tháng 11–12 gần như chắc chắn không kịp nghỉ bù trước mốc reset 01/01 — xem §15 câu 6.

Hệ quả phải xử lý trên UI, **không** để nhân viên phát hiện sau khi mất phép:

- Card `Chính sách phép năm` hiện dải cảnh báo thường trực: *"Phép chưa dùng bị xoá khi tới mốc reset."*
- Thông báo in-app `leave.expiring_soon` gửi cho nhân viên **còn ≥ 1 ngày phép** vào **30 ngày** và **7 ngày** trước mốc reset: *"Bạn còn {n} ngày phép, hết hiệu lực {date}."*
- Thông báo in-app `ot_leave.expiring_soon` gửi cho nhân viên **còn ≥ 1 giờ phép OT** vào **60 ngày**, **30 ngày** và **7 ngày** trước mốc reset: *"Bạn còn {h} giờ phép OT, hết hiệu lực {date}."* Gửi sớm hơn phép năm một nhịp vì nghỉ bù cần sắp xếp với dự án.
- Màn danh sách đơn nghỉ hiện mốc reset cạnh thẻ `Phép năm còn lại`.

Đây là lựa chọn chính sách của công ty, không phải giới hạn kỹ thuật: ledger đã đủ sức mô tả phép tồn nếu sau này muốn cho chuyển.

### 7.5 Trừ quỹ khi duyệt đơn nghỉ

Chỉ `leave_category = 'annual_leave'` trừ quỹ **phép năm**. Ba loại `unpaid_leave`, `sick_leave`, `personal_leave` không đụng tới quỹ nào.

`compensatory_leave` (**nghỉ bù**) không trừ phép năm — nó trừ **quỹ phép OT** (§9.5). Hai quỹ hoàn toàn tách nhau: hết phép năm vẫn nghỉ bù được nếu còn phép OT, và ngược lại.

| Thời điểm | Tác động quỹ |
|---|---|
| `submit` → `pending` | **Không** trừ. Chỉ kiểm tra đủ quỹ để chặn sớm. |
| `approve` → `approved` | Trừ `total_days`, ghi ledger `usage` |
| `cancel` đơn `approved` | Hoàn lại số ngày **chưa diễn ra**; ngày đã qua giữ nguyên đã trừ |
| `reject` / `request_changes` | Không tác động |

**Quy đổi thời lượng sang ngày phép:**

| `duration_unit` | Trừ |
|---|---|
| `full_day` | `total_days` (đã loại T7/CN + lễ) |
| `half_day` | `0.5` |
| `hours` | `0.5` — **quy ước tạm**, xem §15 |

`hours` chưa quy đổi đúng được vì v1 không cấu hình số giờ một ngày công (ngoài phạm vi §1). Lấy `0.5` cho mọi đơn theo giờ là chọn con số **có lợi cho nhân viên** trong lúc chờ chốt, thay vì hardcode `8` giờ/ngày — một hằng số vừa sai với công ty làm 7.5h vừa đi ngược nguyên tắc "FE/BE không hardcode cấu hình" của tài liệu này.

**Đơn vắt qua mốc reset:** BE **tách** `total_days` theo năm phép của từng ngày và trừ vào đúng quỹ tương ứng. Đơn nghỉ 28/12/2026 → 04/01/2027 trừ phần 2026 vào quỹ 2026, phần 2027 vào quỹ 2027. Không cho một đơn ăn hết quỹ năm cũ rồi tràn sang năm mới.

**Vượt quỹ:** `total_days` (phần thuộc năm phép đó) > `annual_remaining` → `LEAVE_QUOTA_EXCEEDED`, chặn ở cả FE và BE, kèm gợi ý chuyển sang `unpaid_leave`. Chặn ở `submit`, và **kiểm lại ở `approve`** vì quỹ có thể đã thay đổi trong lúc đơn chờ duyệt.

### 7.6 Validation lúc Lưu

| Rule | Lỗi |
|---|---|
| `reset.month` ∈ 1–12, `reset.day` ∈ 1–28, integer | Highlight select |
| `reset.time` khớp `^([01]\d\|2[0-3]):[0-5]\d$` | Highlight |
| `monthly_accrual_days` ∈ 0–5, bội của `0.5` | Highlight ô |
| `monthly_accrual_day` ∈ 1–28, integer | Highlight select |
| `first_month_cutoff_day` ∈ 1–28, integer | Highlight select |
| `seniority_tiers[].from_years` ∈ 0–50, integer, **không trùng nhau** | Highlight dòng trùng |
| `seniority_tiers[].bonus_days` ≥ 0, bội của `0.5` | Highlight ô |
| `seniority_tiers` ≤ 20 dòng | Chặn nút `Thêm bậc` |
| Không phải HR | `LEAVE_POLICY_FORBIDDEN` |

BE **sort** `seniority_tiers` theo `from_years` tăng dần trước khi lưu — HR thêm bậc không theo thứ tự vẫn cho lưu, không bắt họ tự sắp.

**Cảnh báo mềm, không chặn:** `bonus_days` **giảm** khi `from_years` tăng (bậc `10 năm → +1` nằm sau bậc `5 năm → +2`) gần như luôn là lỗi nhập — người làm lâu hơn lại được ít phép hơn. FE hiện dialog xác nhận nêu rõ hai bậc bị nghi, nhưng vẫn cho Lưu nếu HR khẳng định.

`monthly_accrual_days = 0` **được phép** — công ty muốn tắt cộng phép tháng và chỉ dùng thưởng thâm niên. Nhưng `monthly_accrual_days = 0` **và** `seniority_tiers = []` thì không ai có phép năm nào; FE hiện dialog xác nhận *"Cấu hình này làm mọi nhân viên có 0 ngày phép năm. Tiếp tục?"* trước khi gửi.

Một `Lưu` ghi **chỉ** 7.1–7.3. Không đụng chính sách WFH, ngày lễ, hay số dư phép đã cộng — **đổi chính sách không tính lại quá khứ** (§13).

### 7.7 Sổ cái phép (ledger)

Mọi lượt cộng / trừ là một dòng, không bao giờ `UPDATE` số dư tại chỗ. Số dư là tổng của ledger, nên luôn trả lời được *"vì sao tôi có 13 ngày"* — câu hỏi mà HR sẽ nhận mỗi năm một lần.

```ts
export type LeaveLedgerType =
  | 'monthly_accrual'    // job cộng phép tháng (§7.2)
  | 'seniority_bonus'    // thưởng thâm niên tại mốc reset (§7.3)
  | 'reset'              // xoá phép tồn khi sang năm phép mới (§7.4)
  | 'usage'              // duyệt đơn nghỉ phép năm (§7.5)
  | 'usage_refund'       // huỷ đơn approved, hoàn ngày chưa diễn ra (§7.5)
  | 'manual_adjustment'; // HR sửa tay — endpoint/UI để v2 (§1)

export interface LeaveLedgerEntry {
  id: number;
  employee_id: number;
  leave_year: number;
  type: LeaveLedgerType;
  /** Dương = cộng, âm = trừ. Bội của 0.5. */
  days: number;
  /** Số dư sau dòng này — denormalize để đối chiếu, không phải nguồn sự thật. */
  balance_after: number;
  effective_at: string;          // ISO datetime
  /** Có khi type = 'usage' / 'usage_refund'. */
  request_id?: number | null;
  request_proposal_number?: string | null;
  note?: string | null;
  created_by?: number | null;    // null = job hệ thống
  created_at: string;
}
```

**Số dư** (`GET /requests/leave-balance`, [`requests-module-spec.md`](./requests-module-spec.md) §9):

```ts
export interface EmployeeLeaveBalance {
  employee_id: number;
  leave_year: number;
  /** Mốc bắt đầu / kết thúc năm phép đang tính — FE hiện "hết hiệu lực {date}". */
  leave_year_start: string;
  leave_year_end: string;

  /** Đã cộng tới **thời điểm hiện tại** — đây là phần thực sự dùng được. */
  accrued_days: number;
  /** Dự kiến cả năm phép nếu làm đủ tới mốc reset. Chỉ để hiển thị. */
  projected_days: number;
  used_days: number;
  /** = accrued_days − used_days. Số dùng để chặn đơn vượt quỹ (§7.5). */
  remaining_days: number;

  /** Tách bạch để nhân viên đọc được công thức. */
  monthly_accrued_days: number;
  seniority_bonus_days: number;
  seniority_years: number;
  /** Bậc thâm niên đã áp (§7.3). null = thâm niên chưa đạt bậc nào. */
  seniority_tier: SeniorityTier | null;

  next_accrual_at: string | null;
}
```

**`accrued_days` và `projected_days` phải là hai số riêng.** Gộp thành một `annual_total` như bản trước của `GET /requests/leave-balance` là mập mờ đúng chỗ dễ gây thiệt hại nhất: nhân viên tháng 3 thấy "12 ngày" rồi xin nghỉ 5 ngày, trong khi quỹ dùng được mới có 3.

---

## 8. Số dư phép nhân viên

Card **read-only** — HR đối chiếu con số hệ thống đã cộng. Không sửa ở v1 (§1).

`GET /settings/leave-balances` — `year?` · `search?` · `department_id?` · `page?`.

**Bảng:** `No` · `Họ tên` (avatar) · `Vào làm` · `Thâm niên` · `Đã cộng` · `Dự kiến cả năm` · `Đã dùng` · `Còn lại` · **`Phép OT`** · ⋯

Cột `Phép OT` là quỹ nghỉ bù (§9.5), đơn vị **giờ** — cố ý khác đơn vị với các cột phép năm bên trái, nên header ghi rõ `(giờ)` và ô hiển thị dạng `12h30` để không ai đọc nhầm thành ngày.

- Bộ lọc **Năm phép** trên đầu card, mặc định năm phép đang chạy.
- Cột `Thâm niên` hiện số năm + bậc đã áp: *"6 năm · bậc từ 5 năm"*. Chưa đạt bậc nào → *"3 năm · chưa đạt bậc"*.
- Cột `Đã cộng` hiện tooltip tách công thức: *"11 (cộng tháng) + 1 (thâm niên, bậc từ 5 năm)"*.
- Cột `Phép OT` hiện tooltip *"đã cộng {x}h · đã nghỉ bù {y}h"*, và dòng phụ `hết hiệu lực {date}` khi số dư > 0 — mốc này trùng mốc reset năm phép (§9.5).
- Menu ⋯ → `Xem sổ cái` → dialog timeline ledger của người đó trong năm phép đang lọc (`GET /settings/leave-balances/:employeeId/ledger`), mỗi dòng: ngày · loại · `+/− n ngày` · số dư sau · link đơn nghỉ nếu là `usage`. Dialog có **2 tab**: `Phép năm` (ngày) và `Phép OT` (giờ) — hai quỹ khác đơn vị nên không trộn vào một timeline.
- Nút export Excel dùng lại `QueryParamsExport` — HR cần file này để đối chiếu với bảng lương.
- Nhân viên `work_status != 'working'` mặc định **ẩn**; checkbox `Hiện cả người đã nghỉ` để tra cứu.
- Sort mặc định: `remaining_days` desc — người còn nhiều phép nhất lên đầu, vì đó là nhóm HR cần nhắc trước mốc reset (§7.4).

### 8.1 Quyền

HR/CEO **xem**. Còn lại không vào được route. Nhân viên thường chỉ thấy số dư **của mình** qua `GET /requests/leave-balance` trên màn đơn nghỉ phép.

---

## 9. Chính sách OT

`GET /settings/overtime-policy` · `PUT /settings/overtime-policy`. Sau `PUT`: invalidate `['settings', 'overtime-policy']` và `['requests', 'ot']`.

Nguồn cho [`requests-ot-spec.md`](./requests-ot-spec.md) §3.3 (hệ số), §3.4 (hạn báo cáo muộn), §3.6 (trần giờ tháng).

```ts
export interface OvertimePolicy {
  /** Tổng hệ số OT theo loại ngày, đơn vị **%**. 150 = 150%. */
  rates: {
    normal: number;    // T2–T6
    weekend: number;   // T7, CN
    holiday: number;   // ngày lễ theo §6
  };
  /**
   * Phần hệ số trả bằng **lương**, đơn vị %. Mặc định 100.
   * Phần dư của mỗi loại ngày (`rates[x] − paid_percent`) chuyển thành
   * **phép OT** — quỹ nghỉ bù tính bằng giờ (§9.5).
   * Một con số dùng chung cho cả ba loại ngày — xem §9.1.
   */
  paid_percent: number;
  /** Trần giờ OT **thực tế** mỗi tháng. null = không kiểm. Cảnh báo mềm, không chặn. */
  max_hours_per_month: number | null;
  /** Quá bao nhiêu ngày kể từ buổi OT thì cảnh báo "báo cáo muộn". */
  late_report_days: number;

  /** Chỉ GET — BE tính sẵn để FE khỏi trừ lại: `rates[x] − paid_percent`. */
  leave_percent?: { normal: number; weekend: number; holiday: number };
}

export interface UpdateOvertimePolicyPayload {
  rates: { normal: number; weekend: number; holiday: number };
  paid_percent: number;
  max_hours_per_month: number | null;
  late_report_days: number;
}
```

**Mặc định khi khởi tạo hệ thống** — khớp Bộ luật Lao động VN (điều 98):

| Field | Mặc định |
|---|---|
| `rates.normal` | `150` |
| `rates.weekend` | `200` |
| `rates.holiday` | `300` |
| `paid_percent` | `100` |
| `max_hours_per_month` | `40` |
| `late_report_days` | `7` |

Seed của BE, **không** phải giá trị FE tự fill khi `GET` lỗi (§13).

### 9.1 Hệ số OT — tách phần lương và phần phép

| | |
|---|---|
| Field | `rates` · `paid_percent` |
| Control | 3 input number cho `rates` (min `100`, max `500`, integer) + 1 input `paid_percent` (min `0`, max `100`, integer) |

**Giờ OT không trả hết bằng tiền.** Tổng hệ số chia làm hai phần:

```
paid_percent       = phần trả bằng LƯƠNG            (cấu hình, mặc định 100)
leave_percent[x]   = rates[x] − paid_percent        (phần chuyển thành PHÉP OT)
```

Với giá trị mặc định:

| Loại ngày | Tổng hệ số | Trả lương | Thành phép OT |
|---|---|---|---|
| Ngày thường | `150%` | `100%` | **`50%`** |
| Cuối tuần | `200%` | `100%` | **`100%`** |
| Ngày lễ | `300%` | `100%` | **`200%`** |

**Ví dụ** — buổi OT `5h00` ngày thường:

```
Trả lương   5h00 × 100%  =  5h00   → vào bảng lương
Phép OT     5h00 ×  50%  =  2h30   → cộng vào quỹ nghỉ bù (§9.5)
──────────────────────────────────
Tổng quy đổi             =  7h30
```

Cùng `5h00` nhưng vào **ngày lễ**: `5h00` trả lương + `10h00` phép OT = `15h00` quy đổi.

**Một `paid_percent` dùng chung cho cả ba loại ngày.** Quy tắc công ty là *"luôn trả 100% bằng lương, phần vượt chuyển thành phép"* — nên đây là một con số, không phải ba. Muốn tách riêng từng loại ngày về sau thì đổi `paid_percent` thành object giống `rates`; phần còn lại của spec không đổi, vì `leave_percent` vốn đã là dẫn xuất theo loại ngày.

**`paid_percent` tối đa `100`.** Trả hơn 100% bằng lương thì `leave_percent` âm và phần "OT" không còn là OT nữa. `paid_percent = 100` **và** `rates[x] = 100` cho ra `leave_percent = 0` — hợp lệ, nghĩa là loại ngày đó không sinh phép OT.

**`rates` tối thiểu `100`.** Hệ số dưới 100% nghĩa là giờ OT được trả **thấp hơn** giờ thường — không có tình huống hợp lệ nào như vậy, và cho nhập sẽ biến một lỗi gõ phím thành sai số lương hàng loạt. Ràng buộc này cũng là thứ bảo đảm `leave_percent ≥ 0` khi `paid_percent ≤ 100`.

**Loại ngày do BE phân loại từ `ot_date`** (một đơn OT = một buổi = một ngày OT), không phải người làm đơn chọn: ngày lễ (§6, kể cả bản `yearly`) → `holiday`; T7/CN → `weekend`; còn lại → `normal`. Thứ tự ưu tiên này nằm ở [`requests-ot-spec.md`](./requests-ot-spec.md) §3.3 — ngày lễ rơi vào chủ nhật tính `holiday`, không phải `weekend`.

**Đổi hệ số không tính lại đơn đã duyệt.** Mỗi đơn OT snapshot **cả hai** con số — `ot_rate_percent` và `ot_paid_percent` — tại lúc CEO duyệt, và số phút phép OT đã cộng vào quỹ thì không tính lại. Đơn còn `draft` / `pending` đọc chính sách hiện hành. FE hiện dòng cảnh báo dưới card: *"Đổi hệ số chỉ áp cho đơn chưa duyệt. Đơn đã duyệt giữ nguyên hệ số cũ và số phép OT đã cộng."*

Nếu không snapshot, một lần HR chỉnh hệ số sẽ làm đổi số liệu của mọi đơn đã đưa vào bảng lương các tháng trước, **và** làm lệch quỹ phép OT mà nhân viên có thể đã tiêu một phần — thứ không bao giờ được phép xảy ra âm thầm.

### 9.2 Trần giờ OT mỗi tháng

| | |
|---|---|
| Field | `max_hours_per_month` |
| Mặc định | `40` (Bộ luật Lao động VN điều 107) |
| Control | Input number nullable, min `1`, max `200`. Trống = không kiểm |

So với **giờ thực tế**, không phải giờ quy đổi — trần của luật tính trên số giờ người ta thực sự làm.

**Cảnh báo mềm, không chặn.** Giờ đã làm rồi thì chặn không xoá được nó; điều cần là CEO **nhìn thấy** trước khi duyệt. Hiệu lực chi tiết: [`requests-ot-spec.md`](./requests-ot-spec.md) §3.6.

### 9.3 Hạn báo cáo OT muộn

| | |
|---|---|
| Field | `late_report_days` |
| Mặc định | `7` |
| Control | Input number, min `0`, max `90`, integer |

Buổi OT có `start_at` đã qua quá số ngày này → đơn gắn nhãn `Báo cáo muộn` trên card Google Chat và dải cảnh báo trên form. **Vẫn gửi được** — xem [`requests-ot-spec.md`](./requests-ot-spec.md) §3.4 vì sao không chặn.

`0` = cảnh báo ngay khi buổi OT đã qua.

### 9.4 Validation lúc Lưu

| Rule | Lỗi |
|---|---|
| `rates.normal` · `rates.weekend` · `rates.holiday` ∈ 100–500, integer | Highlight ô |
| `paid_percent` ∈ 0–100, integer | Highlight ô |
| `paid_percent` ≤ mọi `rates[x]` — bảo đảm `leave_percent ≥ 0` | Highlight ô `paid_percent` + loại ngày vi phạm |
| `max_hours_per_month` `null` hoặc ∈ 1–200, integer | Highlight ô |
| `late_report_days` ∈ 0–90, integer | Highlight ô |
| Không phải HR | `OT_POLICY_FORBIDDEN` |

Ràng buộc `rates ≥ 100` và `paid_percent ≤ 100` đã đủ để `leave_percent` không bao giờ âm; hàng thứ ba chỉ là chốt cuối cho trường hợp một trong hai ràng buộc kia được nới về sau.

**Cảnh báo mềm, không chặn:** `rates.weekend` < `rates.normal`, hoặc `rates.holiday` < `rates.weekend`. Gần như luôn là lỗi nhập — làm cuối tuần mà hệ số thấp hơn ngày thường. Dialog xác nhận nêu rõ hai mức bị nghi, vẫn cho Lưu nếu HR khẳng định.

**Cảnh báo mềm thứ hai:** `paid_percent` bằng đúng `rates.normal` (mặc định là `100` vs `150` nên không vướng). Khi hai số bằng nhau, ngày thường không còn sinh phép OT nào — hợp lệ nhưng đủ bất thường để hỏi lại: *"Ngày thường sẽ không sinh phép OT. Tiếp tục?"*

Một `Lưu` ghi **chỉ** 9.1–9.3. Không đụng chính sách WFH, phép năm, quỹ phép OT đã cộng, hay đơn OT đã duyệt.

### 9.5 Quỹ phép OT

Phần hệ số không trả bằng lương (§9.1) trở thành **phép OT** — quỹ nghỉ bù riêng của từng nhân viên.

| | |
|---|---|
| Đơn vị lưu | **phút** (`minutes`) |
| Đơn vị hiển thị | giờ, dạng `12h30` |
| Tăng khi | CEO **duyệt** một đơn OT ([`requests-ot-spec.md`](./requests-ot-spec.md) §3.9) |
| Giảm khi | Duyệt đơn nghỉ `leave_category = 'compensatory_leave'` |
| Hết hiệu lực | **Tại mốc reset năm phép** (§7.1 bước 2, §7.4) |

**Vì sao đếm bằng giờ chứ không quy ra ngày.** OT sinh ra giờ và nghỉ bù tiêu giờ — quy đổi sang ngày sẽ cần hằng số *"một ngày công mấy giờ"*, thứ v1 cố ý chưa cấu hình (§1 ngoài phạm vi, §15 câu 1). Giữ nguyên đơn vị giờ nên quỹ này chạy được ngay mà không phải chờ chốt câu hỏi đó, và cũng khớp cách người ta nói về nghỉ bù trong thực tế (*"còn 12 tiếng, nghỉ bù chiều mai 4 tiếng"*).

```ts
export type OvertimeLeaveLedgerType =
  | 'ot_accrual'   // CEO duyệt đơn OT → cộng phép
  | 'usage'        // duyệt đơn nghỉ bù → trừ phép
  | 'usage_refund' // huỷ đơn nghỉ bù đã duyệt, hoàn phần chưa diễn ra
  | 'ot_revoked'   // huỷ đơn OT đã duyệt → gỡ lại phần phép đã cộng
  | 'reset';       // xoá quỹ tại mốc reset năm phép (§7.4)

export interface OvertimeLeaveLedgerEntry {
  id: number;
  employee_id: number;
  /** Cùng năm phép với quỹ phép năm — quỹ này reset chung mốc (§7.1). */
  leave_year: number;
  type: OvertimeLeaveLedgerType;
  /** Dương = cộng, âm = trừ. Đơn vị **phút**. */
  minutes: number;
  /** Số dư sau dòng này, phút — denormalize để đối chiếu. */
  balance_after_minutes: number;
  effective_at: string;             // ISO datetime
  /** Đơn sinh ra dòng này: đơn OT (ot_accrual / ot_revoked) hoặc đơn nghỉ bù. */
  request_id?: number | null;
  request_proposal_number?: string | null;
  /** Chỉ với ot_accrual — để giải thích "vì sao được 2h30". */
  source_day_type?: 'normal' | 'weekend' | 'holiday' | null;
  source_total_minutes?: number | null;
  source_leave_percent?: number | null;
  note?: string | null;
  created_by?: number | null;       // null = job hệ thống
  created_at: string;
}

export interface EmployeeOvertimeLeaveBalance {
  employee_id: number;
  leave_year: number;
  /** Mốc hết hiệu lực — trùng leave_year_end của quỹ phép năm (§7.7). */
  expires_at: string;

  accrued_minutes: number;
  used_minutes: number;
  /** = accrued_minutes − used_minutes. Số dùng để chặn đơn nghỉ bù vượt quỹ. */
  remaining_minutes: number;
}
```

**Cộng phép: đúng một lần, lúc CEO duyệt.** Không cộng ở `submit` — đơn có thể bị từ chối. Huỷ một đơn OT đã duyệt thì BE ghi `ot_revoked` gỡ lại đúng số phút đã cộng; nếu nhân viên đã tiêu quá số đó thì **vẫn cho âm** và ghi rõ trong ledger, vì người ta đã nghỉ thật rồi — HR xử lý bằng `manual_adjustment` ở v2, xem §15 câu 7.

**Tiêu phép: đơn nghỉ bù chỉ nhận `duration_unit = 'hours'`.** Nghỉ bù nửa buổi là *"4 giờ"*, không phải *"0.5 ngày"* — cùng lý do với đoạn trên. FE có nút gợi ý nhanh (`2h` · `4h` · `8h`) nhưng giá trị chốt vẫn là số giờ người dùng thấy. Đơn `compensatory_leave` gửi kèm `duration_unit` khác → `COMP_LEAVE_HOURS_ONLY`.

**Vượt quỹ:** số phút xin nghỉ bù > `remaining_minutes` → `OT_LEAVE_INSUFFICIENT`, chặn ở cả `submit` và `approve` (kiểm lại lúc duyệt vì quỹ có thể đã đổi trong lúc chờ). Thông báo kèm số giờ còn lại và gợi ý chuyển sang `annual_leave`.

**Không có màn cấu hình riêng cho quỹ này.** Nó không có tham số nào để chỉnh — mọi con số đều dẫn xuất từ §9.1 và từ các đơn đã duyệt. HR chỉ **xem**, qua cột `Phép OT` ở bảng §8.

---

---

## 10. API

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
| GET | `/settings/leave-policy` | — | `LeavePolicy` (kèm `next_accrual_at`, `next_reset_at`) | HR/CEO; BE đơn nghỉ đọc nội bộ |
| PUT | `/settings/leave-policy` | `UpdateLeavePolicyPayload` | `LeavePolicy` | **HR** |
| GET | `/settings/leave-balances` | `year?` `search?` `department_id?` `include_inactive?` `page?` | `EmployeeLeaveBalance[]` + pagination | HR/CEO |
| GET | `/settings/leave-balances/:employeeId/ledger` | `year?` | `LeaveLedgerEntry[]` | HR/CEO |
| GET | `/settings/ot-leave-balances` | `year?` `search?` `department_id?` `page?` | `EmployeeOvertimeLeaveBalance[]` + pagination | HR/CEO |
| GET | `/settings/ot-leave-balances/:employeeId/ledger` | `year?` | `OvertimeLeaveLedgerEntry[]` | HR/CEO |
| GET | `/settings/leave-balances/export` | `QueryParams & QueryParamsExport` | file blob | HR/CEO |
| GET | `/settings/overtime-policy` | — | `OvertimePolicy` | HR/CEO; BE đơn OT đọc nội bộ |
| PUT | `/settings/overtime-policy` | `UpdateOvertimePolicyPayload` | `OvertimePolicy` | **HR** |

`:id` của block list là **id dòng**, không phải `employee_id`.

`:employeeId` của ledger là **`employee_id`**, không phải id dòng — khác với block list ở trên.

Số dư của **chính user đang đăng nhập** đọc qua `GET /requests/leave-balance` ([`requests-module-spec.md`](./requests-module-spec.md) §9), không qua `/settings/*` — nhân viên thường không có quyền vào nhóm endpoint cấu hình. Endpoint đó trả **cả hai quỹ**: `EmployeeLeaveBalance` (phép năm, ngày) và `ot_leave` (`EmployeeOvertimeLeaveBalance`, phút), để form đơn nghỉ biết ngay còn bao nhiêu mà không phải gọi hai lần.

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
| `LEAVE_POLICY_FORBIDDEN` | Không phải HR gọi `PUT /settings/leave-policy` |
| `LEAVE_POLICY_INVALID` | Payload §7.6 |
| `LEAVE_QUOTA_EXCEEDED` | Đơn `annual_leave` vượt `remaining_days` của năm phép tương ứng (§7.5) — trả kèm `remaining_days` để FE hiện số còn xin được |
| `OT_POLICY_FORBIDDEN` | Không phải HR gọi `PUT /settings/overtime-policy` |
| `OT_POLICY_INVALID` | Payload §9.4 — gồm cả `paid_percent` vượt `rates` |
| `OT_LEAVE_INSUFFICIENT` | Đơn `compensatory_leave` vượt `remaining_minutes` của quỹ phép OT (§9.5) — trả kèm `remaining_minutes` để FE hiện số giờ còn lại |
| `COMP_LEAVE_HOURS_ONLY` | Đơn `compensatory_leave` gửi `duration_unit` khác `'hours'` (§9.5) |

---

## 11. Frontend

```
app/[locale]/(protected)/settings/general/
└── page.tsx

components/pages/settings/general/
├── general-setting-page.tsx
├── wfh-policy-form.tsx
├── wfh-blocked-employees-table.tsx
├── wfh-blocked-employee-dialog.tsx   # Thêm người / sửa ghi chú
├── leave-policy-form.tsx             # §7 — card Chính sách phép năm
├── leave-balances-table.tsx          # §8 — read-only
├── leave-ledger-dialog.tsx           # §8 — timeline sổ cái, 2 tab: phép năm / phép OT
├── overtime-policy-form.tsx          # §9 — card Chính sách OT
├── holidays-table.tsx
└── holiday-form-dialog.tsx

lib/types/wfh.ts                 # WfhPolicy — dùng chung spec WFH
lib/types/holiday.ts
lib/types/wfh-blocked-employee.ts
lib/types/leave-policy.ts        # LeavePolicy, EmployeeLeaveBalance, LeaveLedgerEntry
lib/types/overtime-policy.ts     # OvertimePolicy, EmployeeOvertimeLeaveBalance, OvertimeLeaveLedgerEntry
lib/validations/wfh-blocked-employee.schema.ts
lib/validations/leave-policy.schema.ts   # zod §7.6
lib/validations/overtime-policy.schema.ts # zod §9.4
lib/helpers/leave-accrual.ts     # công thức thâm niên + dự kiến cả năm, dùng cho preview trên form
hooks/queries/settings/
├── use-wfh-policy.ts
├── use-wfh-blocked-employees.ts
├── use-wfh-blocked-employee-mutations.ts
├── use-leave-policy.ts
├── use-leave-policy-mutations.ts
├── use-leave-balances.ts
├── use-leave-ledger.ts
├── use-overtime-policy.ts
├── use-overtime-policy-mutations.ts
├── use-ot-leave-balances.ts
├── use-ot-leave-ledger.ts
├── use-holidays.ts
└── use-holiday-mutations.ts
```

React Query: `['wfh', 'policy']` · `['settings', 'wfh-blocked', params]` · `['settings', 'holidays', year]` · `['settings', 'leave-policy']` · `['settings', 'leave-balances', params]` · `['settings', 'leave-ledger', employeeId, year]` · `['settings', 'overtime-policy']`.

Sau C/U/D block: invalidate `['settings', 'wfh-blocked']` **và** `['wfh']`.

Sau `PUT /settings/leave-policy`: invalidate `['settings', 'leave-policy']`, `['settings', 'leave-balances']` và `['requests', 'leave-balance']`. **Không** invalidate `['wfh']` — hai chính sách không liên quan.

Sau `PUT /settings/overtime-policy`: invalidate `['settings', 'overtime-policy']` và `['requests', 'ot']` — đơn OT chưa duyệt phải tính lại phần lương / phần phép theo chính sách mới (§9.1). Đơn đã duyệt không đổi vì cả hai hệ số đã snapshot.

Sau khi **duyệt hoặc huỷ một đơn OT**: invalidate `['settings', 'ot-leave-balances']` và `['requests', 'leave-balance']` — quỹ phép OT vừa đổi, và form đơn nghỉ bù đọc từ đó.

Sau mỗi CRUD **ngày lễ** (§6): invalidate thêm `['requests', 'ot']` — đổi bảng lễ đổi luôn `day_type` của các đơn OT chưa duyệt.

`leave-accrual.ts` chỉ dùng để **preview** trên form (dòng *"Nhân viên 6 năm sẽ có 13 ngày trong năm phép tới"*). Số thật luôn từ BE — cùng nguyên tắc với `request-chat-card.ts` ở spec chính §12: hai bên phải khớp, sửa một bên thì sửa cả bên kia.

---

## 12. i18n

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
  "leavePolicy": {
    "sectionTitle": "Chính sách phép năm",
    "reset": "Reset năm phép",
    "resetHint": "Mốc đóng năm phép cũ và mở năm mới. Giờ Việt Nam.",
    "resetMonth": "Tháng",
    "resetDay": "Ngày",
    "resetTime": "Giờ",
    "monthlyAccrual": "Cộng phép mỗi tháng",
    "monthlyAccrualUnit": "ngày / tháng",
    "monthlyAccrualDay": "Cộng vào ngày",
    "monthlyAccrualHint": "Quỹ phép tăng dần theo tháng, không cấp trọn gói đầu năm.",
    "firstMonthCutoff": "Tháng vào làm — cộng đủ nếu vào trước ngày",
    "firstMonthCutoffHint": "Vào làm sau ngày này thì tháng đó không được cộng phép.",
    "seniorityTiers": "Bậc thâm niên",
    "seniorityTiersHint": "Cộng thêm một lần cho cả năm phép, trên số phép cộng theo tháng. Lấy bậc cao nhất đạt được, không nội suy giữa hai bậc.",
    "seniorityTierFrom": "Từ",
    "seniorityTierFromUnit": "năm",
    "seniorityTierBonus": "cộng thêm",
    "seniorityTierBonusUnit": "ngày",
    "addTier": "Thêm bậc",
    "removeTier": "Xoá bậc",
    "tierLabel": "bậc từ {years} năm",
    "noTier": "chưa đạt bậc",
    "seniorityTiersEmpty": "Chưa có bậc nào — không ai được thưởng thâm niên.",
    "tiersMaxReached": "Tối đa 20 bậc.",
    "tierDecreasingConfirm": "Bậc từ {highYears} năm được ít phép hơn bậc từ {lowYears} năm. Người làm lâu hơn sẽ nhận ít phép hơn. Vẫn lưu?",
    "noCarryOverWarning": "Phép chưa dùng bị xoá khi tới mốc reset.",
    "nextAccrual": "Lần cộng phép tới: {date}",
    "nextReset": "Reset năm phép: {date}",
    "previewTitle": "Ví dụ",
    "preview": "Nhân viên {years} năm làm việc sẽ có {total} ngày trong năm phép tới ({monthly} cộng tháng + {bonus} thâm niên, {tier}).",
    "zeroQuotaConfirm": "Cấu hình này làm mọi nhân viên có 0 ngày phép năm. Tiếp tục?"
  },
  "leaveBalances": {
    "sectionTitle": "Số dư phép nhân viên",
    "leaveYear": "Năm phép",
    "searchPlaceholder": "Tìm nhân viên",
    "startWorking": "Vào làm",
    "seniority": "Thâm niên",
    "seniorityValue": "{years} năm",
    "accrued": "Đã cộng",
    "accruedBreakdown": "{monthly} (cộng tháng) + {bonus} (thâm niên, {tier})",
    "seniorityWithTier": "{years} năm · {tier}",
    "projected": "Dự kiến cả năm",
    "used": "Đã dùng",
    "remaining": "Còn lại",
    "includeInactive": "Hiện cả người đã nghỉ",
    "viewLedger": "Xem sổ cái",
    "ledgerTitle": "Sổ cái phép — {name} · năm {year}",
    "ledgerBalanceAfter": "Số dư: {balance}",
    "empty": "Chưa có nhân viên nào được cộng phép trong năm phép này.",
    "ledgerType": {
      "monthly_accrual": "Cộng phép tháng",
      "seniority_bonus": "Thưởng thâm niên",
      "reset": "Xoá phép tồn khi reset",
      "usage": "Nghỉ phép năm",
      "usage_refund": "Hoàn phép do huỷ đơn",
      "manual_adjustment": "HR điều chỉnh"
    }
  },
  "overtimePolicy": {
    "sectionTitle": "Chính sách OT",
    "rates": "Hệ số OT",
    "ratesHint": "Phần trăm lương trả cho giờ làm thêm. Loại ngày do hệ thống tự phân loại từ ngày OT.",
    "rateNormal": "Ngày thường",
    "rateWeekend": "Cuối tuần",
    "rateHoliday": "Ngày lễ",
    "ratePercentUnit": "%",
    "snapshotWarning": "Đổi hệ số chỉ áp cho đơn chưa duyệt. Đơn đã duyệt giữ nguyên hệ số cũ.",
    "maxHoursPerMonth": "Trần giờ OT mỗi tháng",
    "maxHoursUnit": "giờ",
    "maxHoursHint": "Tính trên giờ thực tế, không phải giờ quy đổi. Để trống = không kiểm. Vượt trần chỉ cảnh báo, không chặn gửi đơn.",
    "lateReportDays": "Hạn báo cáo OT muộn",
    "lateReportUnit": "ngày",
    "lateReportHint": "Buổi OT đã qua quá số ngày này thì đơn gắn nhãn Báo cáo muộn. Vẫn gửi được.",
    "rateOrderConfirm": "Hệ số {lower} ({lowerValue}%) thấp hơn {higher} ({higherValue}%). Vẫn lưu?"
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
    "loadFailed": "Không tải được cấu hình. Thử lại.",
    "leavePolicyInvalid": "Cấu hình phép năm không hợp lệ.",
    "overtimePolicyInvalid": "Cấu hình OT không hợp lệ.",
    "rateTooLow": "Hệ số OT phải từ 100% trở lên.",
    "tierDuplicateYears": "Đã có bậc từ {years} năm.",
    "leaveQuotaExceeded": "Bạn chỉ còn {remaining} ngày phép năm. Cân nhắc xin nghỉ không lương."
  }
}
```

Nhãn thứ trên form: T2–T7, CN — lấy `messages`, không hardcode.

---

## 13. Trường hợp biên

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
| `GET /settings/leave-policy` lỗi | Chặn card, retry. **Không** fill 1 ngày/tháng / 01-01 / +1 mỗi 5 năm — cùng nguyên tắc với policy WFH. |
| HR đổi `monthly_accrual_days` từ 1 → 1.5 giữa năm phép | **Không** tính lại quá khứ. Các lượt đã cộng giữ nguyên trong ledger; mức mới áp từ lượt cộng kế tiếp. `projected_days` cập nhật ngay. |
| HR sửa bảng bậc thâm niên giữa năm phép | Thưởng đã cộng tại mốc reset giữ nguyên trong ledger. Bảng mới áp từ mốc reset kế tiếp. Card §8 vẫn hiện bậc **đã áp** cho năm phép đang chạy, không phải bậc theo bảng mới — nếu không HR sẽ thấy số dư "sai" so với bảng đang xem. |
| HR xoá bậc mà nhiều người đang hưởng | Cho xoá; thưởng năm nay đã cộng nên không ai mất phép ngay. Dialog xác nhận nêu số người sẽ tụt bậc từ mốc reset sau. |
| Thâm niên rơi giữa hai bậc (7 năm, bảng có 5 và 10) | Lấy bậc `từ 5 năm`. Không nội suy (§7.3). |
| Thâm niên vượt bậc cuối (25 năm, bậc cuối là 15) | Lấy bậc cuối. Bảng bậc chính là trần. |
| `seniority_tiers = []` | Hợp lệ, không cảnh báo — quỹ phép chỉ còn phần cộng tháng. |
| HR nhập bậc không theo thứ tự năm | BE sort tăng dần trước khi lưu (§7.6). |
| Bậc sau được ít phép hơn bậc trước | Cảnh báo mềm + dialog xác nhận; vẫn lưu được nếu HR khẳng định (§7.6). |
| HR đổi mốc reset giữa năm phép | Năm phép đang chạy giữ ngày kết thúc cũ; mốc mới áp từ kỳ sau. FE hiện `next_reset_at` trước khi Lưu. |
| Job cộng phép tháng chạy hai lần (retry / deploy trùng) | BE idempotent theo `(employee_id, leave_year, type, effective_at)` — lượt thứ hai không ghi thêm ledger. |
| Job cộng phép tháng lỗi, chạy bù muộn | Ghi ledger với `effective_at` = mốc **đúng theo lịch**, không phải lúc job chạy. Số dư không lệch vì chạy muộn. |
| Nhân viên vào làm đúng `first_month_cutoff_day` | Được cộng đủ tháng đó (điều kiện là `≤`, không phải `<`). |
| Nhân viên thiếu `actual_start_working_date` và `start_working_date` | Không cộng phép tháng cho người đó; BE log cảnh báo, card §8 hiện icon cảnh báo ở hàng đó với tooltip *"Thiếu ngày vào làm trong hồ sơ"*. Không đoán ngày. |
| Đơn nghỉ phép năm vắt qua mốc reset | Tách `total_days` theo từng năm phép, trừ vào đúng quỹ (§7.5). |
| Đơn `pending` khi tới mốc reset, được duyệt sau đó | Trừ vào quỹ của năm phép chứa ngày nghỉ, **không** phải năm phép lúc duyệt. Nếu quỹ năm cũ đã bị xoá → `LEAVE_QUOTA_EXCEEDED` lúc duyệt; người duyệt thấy lỗi trên dialog, không silent. |
| Huỷ đơn `approved` sau khi mốc reset đã qua | Hoàn phép vào **năm phép của ngày nghỉ**. Năm đó đã đóng → ledger vẫn ghi `usage_refund` để số liệu khớp, nhưng số dư năm mới **không** tăng. |
| Nhân viên nghỉ việc giữa tháng | Không cộng phép tháng đó (§7.2). Số dư giữ lại để tra cứu, không xoá. |
| `monthly_accrual_days = 0` và `seniority_bonus_days = 0` | Cho lưu sau dialog xác nhận (§7.6). Mọi nhân viên có 0 ngày phép năm; đơn `annual_leave` đều bị `LEAVE_QUOTA_EXCEEDED`. |
| Hai HR lưu chính sách phép cùng lúc | Lần sau thắng — giống policy WFH. |
| Nhân viên mở màn đơn nghỉ đúng lúc job cộng phép chạy | Số dư đọc lại từ BE mỗi lần vào form; không cache cứng quá 1 phút. |
| `GET /settings/overtime-policy` lỗi | Chặn card OT, retry. **Không** fill 150/200/300 — form đơn OT cũng chặn với `OT_POLICY_UNAVAILABLE`. |
| HR đổi hệ số khi đang có đơn OT `pending` | Đơn chưa duyệt tính theo hệ số **mới** khi mở ra xem. Đơn `approved` giữ hệ số đã snapshot (§9.1). |
| HR nhập hệ số cuối tuần thấp hơn ngày thường | Cảnh báo mềm + dialog xác nhận; vẫn lưu được (§9.4). |
| HR nhập hệ số < 100% | Chặn cứng — giờ OT không thể trả thấp hơn giờ thường (§9.1). |
| HR thêm ngày lễ trùng ngày đơn OT `approved` | Hệ số đã snapshot nên đơn không đổi. BE gửi in-app cho HR để tự quyết định ([`requests-ot-spec.md`](./requests-ot-spec.md) §10). |
| HR thêm ngày lễ trùng ngày đơn OT `pending` | Đơn đó chuyển `day_type = holiday` ngay; CEO thấy hệ số 300% khi mở đơn. |
| Hạ `max_hours_per_month` xuống dưới mức nhiều người đã đạt | Cho lưu. Không hồi tố đơn đã duyệt; cảnh báo áp cho đơn gửi từ lúc này. |
| `max_hours_per_month = null` | Hợp lệ — tắt hẳn cảnh báo trần giờ. |
| `late_report_days = 0` | Hợp lệ — cảnh báo ngay khi buổi OT đã qua. |
| Hai HR lưu chính sách OT cùng lúc | Lần sau thắng — giống hai policy kia. |

---

## 14. Liên kết spec WFH

Lưới đăng ký đọc policy/holiday từ đây. Không copy form cấu hình vào `/requests/wfh`.

| Spec WFH | Nguồn |
|---|---|
| R2 max ngày | §4.3 |
| R3 cột cam | §4.1 |
| R4 ngày lễ | §6 |
| Hạn sửa / job khoá tuần | §4.2 |
| Hàng user bị block | §5 · WFH §3.2.3 |

### Liên kết spec đơn OT

| [`requests-ot-spec.md`](./requests-ot-spec.md) | Nguồn |
|---|---|
| Hệ số `rate_percent` của đơn (§3.3) | §9.1 |
| Phân loại `day_type = 'holiday'` (§3.3) | §6 — bảng ngày lễ dùng chung |
| Cảnh báo `Báo cáo muộn` (§3.4) | §9.3 |
| Cảnh báo vượt trần giờ tháng (§3.6) | §9.2 |
| `OT_POLICY_UNAVAILABLE` trên form đơn OT | §9 · `GET /settings/overtime-policy` |

### Liên kết spec đơn nghỉ phép

| [`requests-module-spec.md`](./requests-module-spec.md) | Nguồn |
|---|---|
| `GET /requests/leave-balance` (§9) | §7.7 — `EmployeeLeaveBalance` |
| Thẻ `Phép năm còn lại` / `Đã dùng năm nay` (§11.1) | §7.7 — `remaining_days` / `used_days` |
| `leave_category = 'annual_leave'` trừ quỹ (§5.1) | §7.5 |
| `total_days` loại ngày lễ | §6 |
| `LEAVE_QUOTA_EXCEEDED` khi submit / approve | §7.5 |

---

## 15. Câu hỏi cần chốt

1. **Số giờ một ngày công** — đơn nghỉ phép năm theo giờ (`duration_unit = 'hours'`) hiện trừ cố định `0.5` ngày (§7.5), vì v1 không cấu hình số giờ/ngày công. Cần chốt: thêm field `work_hours_per_day` vào chính sách phép năm để quy đổi đúng (`total_hours / work_hours_per_day`), hay **chặn** hẳn `annual_leave` theo giờ và chỉ cho nghỉ nửa ngày trở lên? Chọn cách nào cũng phải sửa cả §7.5 và bảng thời lượng ở spec chính §6.2.
2. **Phép thâm niên cho người vào làm giữa năm phép** — hiện họ không được thưởng cho năm đó (§7.3), lượt đầu tiên là mốc reset kế tiếp. Đúng ý công ty chưa? Nếu muốn cộng ngay khi một người **lên bậc** giữa năm thì cần job kiểm hằng ngày thay vì cộng một lần tại mốc reset.
3. **Thanh toán phép chưa dùng khi nghỉ việc** — §7.4 xoá phép tồn tại mốc reset, nhưng chưa nói gì về người nghỉ việc giữa năm còn phép. Nếu công ty trả lương cho phép chưa dùng thì cần một luồng riêng và ERP phải xuất được số liệu cho bảng lương.
4. **Ai được xem số dư phép của người khác** — §8 để HR/CEO. Quản lý trực tiếp có cần thấy số dư của cấp dưới khi duyệt đơn nghỉ không? Hiện họ duyệt mà không biết người đó còn bao nhiêu phép.
5. **Phụ cấp OT ban đêm và trần giờ OT theo năm** — §9 chưa có cả hai. Chi tiết và hệ quả kỹ thuật: [`requests-ot-spec.md`](./requests-ot-spec.md) §11 câu 2 và 3. Chốt ở đây thì thêm field vào `OvertimePolicy`, không phát sinh màn mới.
