# Spec — Đăng ký WFH (Đơn từ ▸ WFH)

| | |
|---|---|
| **Thuộc module** | `requests` — mục con **Đơn từ ▸ Đăng ký WFH** |
| **Route** | `/requests/wfh` |
| **Trạng thái tài liệu** | Draft v1 |
| **Ngày tạo** | 2026-09-15 |
| **Spec anh em** | [`requests-module-spec.md`](./requests-module-spec.md) — đơn xin nghỉ phép + phần dùng chung |

> **Vì sao tách riêng.** WFH **không** dùng chung mô hình với đơn xin nghỉ phép. Đơn nghỉ là một khoảng thời gian liên tục, có thể nửa ngày hoặc theo giờ, duyệt bởi quản lý trực tiếp, 6 trạng thái. WFH là **một bản đăng ký theo tuần**, gồm một tập ngày rời rạc trong tuần, mặc định tự duyệt, chỉ 3 trạng thái. Nhồi hai thứ vào một entity sẽ khiến gần như mọi trường phải nullable và mọi hàm phải `if (type === …)`. Vì vậy WFH có **entity riêng, bảng riêng, endpoint riêng**, chỉ dùng chung phần hạ tầng (org-chart, action log, thông báo in-app, permission matrix).

---


## 2. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| **Bản đăng ký (registration)** | Một bản ghi ứng với **một nhân viên × một tuần**. Mỗi nhân viên có tối đa 1 bản đăng ký cho mỗi tuần. |
| **Tuần đăng ký** | Tuần kế tiếp tuần hiện tại, tính từ **thứ 2 đến thứ 6**. Thứ 7 và chủ nhật không nằm trong phạm vi. |
| **Hạn sửa** | **23:59 chủ nhật** ngay trước tuần đăng ký. Qua mốc này tuần bị **khoá**. |
| **Khoá tuần (lock)** | Thời điểm hết hạn sửa. Mọi bản `awaiting_approval` tự chuyển thành `approved`. |
| **Ngày bắt buộc lên văn phòng** | Ngày trong tuần không được đăng ký WFH. Mặc định **thứ 5**, nhưng **cấu hình được** (§3.2). |
| **BO** | `position_code = 'bo_division'`. **DD** | `position_code = 'delivery_division'`. Hai vai trò giám sát toàn công ty (§6). |

---

## 3. Quy tắc nghiệp vụ

### 3.1 Số đơn

Dùng lại nguyên quy tắc `Proposal Number` ở §6.1 của spec chính: `{SEQ}/{MMYY}/{FULLNAME_UPPER}`. Mỗi **bản đăng ký tuần** là một số, không phải mỗi ngày WFH.

### 3.2 Cấu hình chính sách — KHÔNG hardcode

FE **không được** viết cứng "thứ 5" hay "2 ngày" vào code. Toàn bộ tham số lấy từ `GET /wfh/policy`:

```ts
export interface WfhPolicy {
  /** Số ngày WFH tối đa trong một tuần. Mặc định 2. */
  max_days_per_week: number;
  /** Số ngày tối thiểu để gửi được đăng ký. Mặc định 1. */
  min_days_per_week: number;
  /**
   * Các thứ bị khoá — ngày bắt buộc lên văn phòng.
   * ISO weekday: 1 = thứ 2 … 5 = thứ 6. Mặc định [4] (thứ 5).
   * BO đổi được trong phần cấu hình; FE luôn render theo mảng này.
   */
  blocked_weekdays: number[];
  /** Các thứ mở cho đăng ký. Mặc định [1,2,3,4,5] (thứ 2 → thứ 6). */
  selectable_weekdays: number[];
  /** Hạn sửa. Mặc định chủ nhật 23:59 theo giờ VN. */
  edit_deadline: { weekday: number; time: string };
  /** true → bản awaiting_approval tự thành approved khi khoá tuần. Mặc định true. */
  auto_approve_on_lock: boolean;
}
```

### 3.3 Quy tắc chọn ngày

| # | Quy tắc | Kiểm ở đâu |
|---|---|---|
| **R1** | Chỉ chọn trong **thứ 2 → thứ 6** (`selectable_weekdays`). Thứ 7, chủ nhật không hiển thị. | FE + BE |
| **R2** | Tối đa **`max_days_per_week`** ngày (mặc định 2), tối thiểu `min_days_per_week` (mặc định 1) để gửi được. | FE + BE |
| **R3** | **Không chọn được ngày trong `blocked_weekdays`** — mặc định thứ 5, là ngày bắt buộc lên văn phòng. Chip ngày đó hiển thị disable kèm tooltip *"Ngày bắt buộc có mặt tại văn phòng"*. | FE + BE |
| **R4** | **Không chọn được ngày nghỉ lễ.** Chip disable kèm tên ngày lễ trong tooltip. Danh sách ngày lễ lấy từ `GET /wfh/weeks/next` (§7). | FE + BE |
| **R5** | Chỉ đăng ký cho **tuần kế tiếp**. Không có ô chọn tuần — hệ thống tự xác định và hiển thị khoảng ngày. | BE (FE không gửi `week_start`) |
| **R6** | Mỗi nhân viên **tối đa 1 bản đăng ký cho mỗi tuần**. Gọi tạo lần hai trên cùng tuần → BE trả về bản đang có để sửa, không tạo bản mới. | BE |
| **R7** | Ngày lễ **không được tính** vào hạn mức `max_days_per_week` — vì không chọn được. Nếu cả tuần chỉ còn < `min_days_per_week` ngày hợp lệ, FE hiện thông báo *"Tuần này không đủ ngày hợp lệ để đăng ký WFH"* và ẩn nút gửi. | FE + BE |

**Ví dụ tuần 21/09 – 25/09/2026** (giả sử 23/09 là ngày lễ, thứ 5 bị khoá):

```
  T2 21/09   T3 22/09   T4 23/09   T5 24/09   T6 25/09
  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐
  │  ✓    │  │       │  │ disable│  │ disable│  │  ✓    │
  │ chọn  │  │ chọn  │  │ Ngày lễ│  │ Bắt   │  │ chọn  │
  │       │  │ được  │  │        │  │ buộc  │  │       │
  └───────┘  └───────┘  └───────┘  └───────┘  └───────┘
                          (R4)       (R3)
  Đã chọn 2/2
```

### 3.4 Cửa sổ sửa và khoá tuần

```
  Tuần hiện tại (N)                    │  Tuần đăng ký (N+1)
  T2   T3   T4   T5   T6   T7   CN     │  T2 ─────────────── T6
  ├──────── mở đăng ký & sửa ─────────┤│
                            23:59 CN ──┘  khoá
                            (lock)
```

- Đăng ký cho tuần N+1 **mở suốt tuần N**, tới **23:59 chủ nhật** của tuần N.
- Trong cửa sổ đó nhân viên **sửa thoải mái**: thêm ngày, bớt ngày, đổi ngày, huỷ hẳn.
- **Mọi lần sửa đều ghi action log** (§5) — ai sửa, lúc nào, từ ngày nào sang ngày nào.
- Qua 23:59 chủ nhật: tuần bị khoá, form chuyển read-only, mọi bản `awaiting_approval` tự thành `approved` (khi `auto_approve_on_lock = true`).
- BE nên thực hiện khoá bằng **job chạy lúc 00:00 thứ 2**, đồng thời đánh giá lười (lazy) khi đọc để phòng job lỗi — không được để một bản kẹt `awaiting_approval` mãi.

---

## 4. Trạng thái

Đúng **3 trạng thái** như yêu cầu:

```ts
export const WFH_STATUSES = ['awaiting_approval', 'approved', 'rejected'] as const;
export type WfhStatus = (typeof WFH_STATUSES)[number];
```

| Status | Nhãn VI | Màu (theo bảng chip có sẵn) | Ý nghĩa |
|---|---|---|---|
| `awaiting_approval` | Chờ duyệt | `#FEF3C7` / `#B45309` | Đã gửi, tuần chưa khoá. Nhân viên còn sửa được. |
| `approved` | Đã duyệt | `#D1FAE5` / `#047857` | Tuần đã khoá và không bị từ chối. Read-only. |
| `rejected` | Từ chối | `#FEE2E2` / `#B91C1C` | BO hoặc DD đã từ chối, kèm lý do bắt buộc. |

### 4.1 Luồng

```
   (chưa có)
       │ tạo + gửi
       ▼
 [awaiting_approval] ──── nhân viên sửa ────┐
       │      ▲                             │
       │      └─────────────────────────────┘  (ghi log mỗi lần)
       │
       ├── 23:59 CN, khoá tuần ──────► [approved]
       │
       └── BO/DD từ chối (bắt buộc lý do) ──► [rejected]
                                                  │
                     [approved] ── BO/DD từ chối ──┘
```

| Từ | Hành động | Đến | Ai được làm | Điều kiện |
|---|---|---|---|---|
| — | `create` + gửi | `awaiting_approval` | Nhân viên | Trước hạn sửa |
| `awaiting_approval` | `update` | `awaiting_approval` | Chính chủ | Trước hạn sửa; ghi log |
| `awaiting_approval` | `withdraw` (huỷ đăng ký) | (xoá mềm) | Chính chủ | Trước hạn sửa |
| `awaiting_approval` | `lock` (tự động) | `approved` | Hệ thống | 23:59 CN |
| `awaiting_approval` | `reject` (bắt buộc lý do) | `rejected` | **BO, DD**, CEO | Bất cứ lúc nào |
| `approved` | `reject` (bắt buộc lý do) | `rejected` | **BO, DD**, CEO | Trước khi tuần kết thúc |
| `rejected` | `update` + gửi lại | `awaiting_approval` | Chính chủ | **Chỉ khi chưa qua hạn sửa** |

**Lưu ý:** nhân viên **không** tự chuyển sang `approved` được; và sau khi tuần đã khoá thì `rejected` là trạng thái cuối — muốn WFH tuần đó phải xin ngoài hệ thống.

---

## 5. Mô hình dữ liệu

```ts
// lib/types/wfh.ts

export interface WfhDay {
  /** ISO date của ngày WFH, ví dụ "2026-09-21". */
  date: string;
  /** ISO weekday: 1 = thứ 2 … 5 = thứ 6. Redundant nhưng tiện cho UI. */
  weekday: number;
}

export interface WfhRegistrationRes {
  id: number;
  proposal_number: string;      // "03/0926/NGUYENTHEHOAINAM"

  // Tuần
  week_start: string;           // ISO date — thứ 2 của tuần
  week_end: string;             // ISO date — thứ 6 của tuần
  iso_year: number;             // 2026
  iso_week: number;             // 39

  // Người đăng ký
  employee_id: number;
  employee?: WfhUserRef | null;
  department_id?: number | null;
  department_name?: string | null;

  // Nội dung
  days: WfhDay[];               // 1..max_days_per_week, đã sort tăng dần
  note?: string | null;         // ghi chú tuỳ chọn, ≤ 300 ký tự

  // Trạng thái
  status: WfhStatus;
  submitted_at: string;
  /** Thời điểm tuần bị khoá. null = chưa khoá, nhân viên còn sửa được. */
  locked_at?: string | null;
  /** Hạn sửa của chính bản này — BE tính sẵn để FE khỏi tự suy ra. */
  edit_deadline_at: string;
  /** true khi now < edit_deadline_at và status cho phép sửa. */
  can_edit: boolean;

  // Từ chối
  rejected_at?: string | null;
  rejected_by?: number | null;
  rejected_by_user?: WfhUserRef | null;
  reject_reason?: string | null;

  created_at?: string;
  updated_at?: string;
  action_logs?: WfhActionLog[];
}

export interface WfhUserRef {
  id: number;
  full_name: string;
  email: string;
  position_code?: string | null;
  avatar_url?: string | null;
}

export interface WfhActionLog {
  id: number;
  registration_id: number;
  action: 'created' | 'updated' | 'withdrawn' | 'locked' | 'rejected' | 'resubmitted';
  /** Với 'updated': ghi lại thay đổi để đối chiếu — yêu cầu "ghi lại log vào hệ thống". */
  days_before?: WfhDay[] | null;
  days_after?: WfhDay[] | null;
  note?: string | null;         // lý do từ chối
  actor?: WfhUserRef | null;
  created_at: string;
}

export interface WfhWeekInfo {
  week_start: string;
  week_end: string;
  iso_year: number;
  iso_week: number;
  edit_deadline_at: string;
  is_locked: boolean;
  /** Từng ngày trong tuần kèm lý do bị khoá — FE render chip theo đúng cái này. */
  days: Array<{
    date: string;
    weekday: number;
    selectable: boolean;
    /** Vì sao không chọn được. null khi selectable = true. */
    blocked_reason?: 'holiday' | 'mandatory_office' | null;
    /** Tên ngày lễ để hiện trong tooltip. */
    holiday_name?: string | null;
  }>;
}
```

### 5.1 Payload

```ts
export interface UpsertWfhRegistrationPayload {
  /** Danh sách ngày WFH. BE tự xác định tuần — FE KHÔNG gửi week_start. */
  dates: string[];              // ISO date, 1..max_days_per_week
  note?: string;
}

export interface WfhRejectPayload {
  reason: string;               // bắt buộc, 5–500 ký tự
}

export interface QueryParamsWfh extends QueryParams {
  /** Tab trên UI. */
  scope?: 'mine' | 'all';
  status?: WfhStatus | WfhStatus[];
  /** Lọc theo tuần — truyền thứ 2 của tuần. */
  week_start?: string;
  /** Lọc theo nhân viên (chỉ BO/DD/CEO). */
  employee_id?: number;
  department_id?: number;
  search?: string;              // theo tên nhân viên / số đơn
  sort_by?: 'week_start' | 'employee_name' | 'status' | 'submitted_at';
  sort_order?: 'asc' | 'desc';
}
```

---

## 6. Phân quyền

WFH dùng chung module key `requests`, nhưng **phạm vi đọc rộng hơn** so với đơn nghỉ phép:

| Vai trò | Xem | Đăng ký | Sửa | Từ chối |
|---|---|---|---|---|
| Nhân viên bất kỳ | Của mình | ✅ | Của mình, trước hạn | ❌ |
| **BO** (`bo_division`) | **Toàn công ty** | ✅ | Của mình | ✅ |
| **DD** (`delivery_division`) | **Toàn công ty** | ✅ | Của mình | ✅ |
| `ceo` | Toàn công ty | ✅ | Của mình | ✅ |
| Quản lý khác (`team_leader`, `tech_lead`, `delivery_leader`) | Của mình + cấp dưới | ✅ | Của mình | ❌ |

**Khác biệt cần lưu ý so với spec chính:** trong `PERMISSION_MATRIX` hiện tại, `delivery_division` chỉ đọc được "của mình + cấp dưới". Với WFH, DD cần đọc **toàn công ty**. Đây là ngoại lệ ở mức record-scope, không phải mức module — xử lý ở BE khi resolve `scope=all`, không nới `read` trong matrix (nới ra sẽ ảnh hưởng cả đơn nghỉ phép).

**Không ai được từ chối đăng ký của chính mình** — kể cả BO/DD.

---

## 7. Hợp đồng API

| Method | Endpoint | Payload / Params | Response |
|---|---|---|---|
| GET | `/wfh/policy` | — | `WfhPolicy` (§3.2) |
| GET | `/wfh/weeks/next` | — | `WfhWeekInfo` — tuần kế tiếp + tình trạng từng ngày |
| GET | `/wfh/registrations` | `QueryParamsWfh` | `WfhRegistrationRes[]` + `WfhMeta` |
| GET | `/wfh/registrations/:id` | — | `WfhRegistrationRes` |
| GET | `/wfh/registrations/my-next-week` | — | `WfhRegistrationRes \| null` — bản của tôi cho tuần sau |
| PUT | `/wfh/registrations/next-week` | `UpsertWfhRegistrationPayload` | `WfhRegistrationRes` — **upsert**, thoả R6 |
| DELETE | `/wfh/registrations/:id` | — | `void` (huỷ đăng ký, chỉ trước hạn sửa) |
| POST | `/wfh/registrations/:id/reject` | `WfhRejectPayload` | `WfhRegistrationRes` |
| GET | `/wfh/registrations/:id/action-logs` | — | `WfhActionLog[]` |
| GET | `/wfh/export` | `QueryParamsWfh & QueryParamsExport` | file blob |

```ts
export interface WfhMeta extends PaginationMeta {
  /** Số nhân viên đã đăng ký cho tuần đang lọc. */
  registered_count?: number;
  /** Tổng lượt WFH trong tuần đang lọc. */
  total_days?: number;
}
```

> **Dùng `PUT … /next-week` chứ không phải `POST`** vì đây là upsert theo (nhân viên × tuần): gửi lần đầu là tạo, gửi lại là sửa. Như vậy FE không phải tự phân biệt tạo hay sửa, và R6 được đảm bảo ở mức API.

**Mã lỗi:**

| Code | Ý nghĩa | Xử lý UI |
|---|---|---|
| `WFH_WEEK_LOCKED` | Đã qua 23:59 chủ nhật | Toast + chuyển form sang read-only + refetch |
| `WFH_TOO_MANY_DAYS` | Vượt `max_days_per_week` | Chặn ngay ở FE; nếu vẫn lọt thì toast |
| `WFH_DAY_NOT_SELECTABLE` | Chọn ngày lễ hoặc ngày bắt buộc lên văn phòng | Toast nêu rõ ngày nào và vì sao |
| `WFH_ALREADY_REGISTERED` | Đã có bản cho tuần đó | Điều hướng sang bản đang có |
| `WFH_CANNOT_REJECT_OWN` | Tự từ chối đăng ký của mình | Ẩn nút từ chối với chính chủ |
| `WFH_REASON_REQUIRED` | Từ chối mà không nhập lý do | Highlight ô lý do |

---

## 8. Màn hình

### 8.1 `/requests/wfh` — Đăng ký WFH

Hai tab:

| Tab | Ai thấy | Nội dung |
|---|---|---|
| **Của tôi** | Mọi người (mặc định) | Lịch sử đăng ký của chính mình |
| **Toàn công ty** | BO, DD, CEO | Đăng ký của toàn bộ nhân viên (§8.3) |

**Khối đăng ký tuần sau** — nằm trên cùng tab "Của tôi", là thứ người dùng vào đây để làm:

```
┌──────────────────────────────────────────────────────────────────┐
│  Đăng ký WFH tuần sau                        [ Còn 2 ngày 04:12 ]│
│  Tuần 39 · 21/09 – 25/09/2026                                    │
│                                                                   │
│   T2        T3        T4        T5         T6                    │
│   21/09     22/09     23/09     24/09      25/09                 │
│  ┌──────┐ ┌──────┐ ┌──────┐  ┌──────┐   ┌──────┐                │
│  │  ✓   │ │      │ │ Nghỉ │  │ Bắt  │   │  ✓   │                │
│  │      │ │      │ │ lễ   │  │ buộc │   │      │                │
│  └──────┘ └──────┘ └──────┘  └──────┘   └──────┘                │
│   chọn     chọn     disable   disable     chọn                   │
│                                                                   │
│  Đã chọn 2/2 ngày                                                │
│  Ghi chú (tuỳ chọn) ────────────────────────────────────────     │
│                                                                   │
│  Sửa được tới 23:59 chủ nhật 20/09.        [ Huỷ ]  [ Lưu ]      │
└──────────────────────────────────────────────────────────────────┘
```

Chi tiết:

- **Không có ô chọn tuần.** Hệ thống chỉ cho đăng ký tuần kế tiếp và hiển thị sẵn khoảng ngày `21/09 – 25/09/2026` cùng số tuần ISO.
- **Chip ngày** render theo `WfhWeekInfo.days`, **không suy diễn ở FE**. Chip disable hiện tooltip theo `blocked_reason`: `holiday` → tên ngày lễ; `mandatory_office` → *"Ngày bắt buộc có mặt tại văn phòng"*.
- **Bộ đếm `Đã chọn n/max`**. Khi đã đủ `max`, các chip chưa chọn chuyển sang mờ + con trỏ `not-allowed`, tooltip *"Tối đa 2 ngày mỗi tuần"* — chặn ngay tại chỗ thay vì để bấm rồi mới báo lỗi.
- **Đồng hồ đếm ngược tới hạn sửa** ở góc phải, đổi sang màu cảnh báo khi còn < 24 giờ.
- Sau hạn sửa: cả khối chuyển read-only, chip đã chọn hiện dạng tĩnh, dòng chân đổi thành *"Tuần này đã khoá lúc 23:59 20/09."*
- Đã có đăng ký rồi thì nút là `Cập nhật` thay vì `Lưu`, và hiện dòng *"Đã đăng ký lúc … · đã sửa n lần"* có link mở lịch sử thay đổi.

**Bảng lịch sử (tab "Của tôi")** — dưới khối đăng ký:

`Tuần` · `Ngày WFH` · `Số ngày` · `Trạng thái` · `Ghi chú` · `Cập nhật lần cuối` · ⋯

Bộ lọc: `Trạng thái`, `Khoảng thời gian`.

### 8.2 Lịch sử thay đổi

Mở từ link ở khối đăng ký hoặc từ màn chi tiết. Timeline dọc, mỗi mục một lần thao tác:

- `Nguyễn Thế Hoài Nam đã đăng ký` — T2 21/09, T3 22/09 · *18/09/2026 09:12*
- `Nguyễn Thế Hoài Nam đã sửa` — bỏ T3 22/09, thêm T6 25/09 · *19/09/2026 14:05*
- `Hệ thống đã khoá tuần` — chuyển sang Đã duyệt · *21/09/2026 00:00*
- `Trần Thị Ngọc Hà đã từ chối` — *"Tuần này team cần có mặt đủ để onboard nhân sự mới"* · *20/09/2026 16:30*

Phần `days_before` / `days_after` trong action log chính là thứ để render dòng "bỏ … thêm …".

### 8.3 Tab "Toàn công ty" — dành cho BO và DD

Đây là màn giám sát mà BO/DD dùng hằng tuần.

**Bộ lọc** (đúng 3 cái được yêu cầu, cộng thêm phòng ban cho dễ dùng):

| Bộ lọc | Kiểu | Mặc định |
|---|---|---|
| **Tuần** | Chọn tuần, hiển thị `Tuần 39 · 21/09 – 25/09` | Tuần kế tiếp |
| **Trạng thái** | Chờ duyệt / Đã duyệt / Từ chối / Tất cả | Tất cả |
| **Nhân viên** | Combobox tìm theo tên | — |
| Phòng ban | Select | — |

**Bảng:**

`Nhân viên` (avatar + tên + chức danh) · `Phòng ban` · `Tuần` · `Ngày WFH` (chip T2/T3/T6) · `Số ngày` · `Trạng thái` · `Ghi chú` · ⋯

- Hàng `Ghi chú` hiện lý do từ chối khi `status = rejected`, truncate + tooltip đầy đủ.
- Menu ⋯ có **`Từ chối`** (mở dialog bắt buộc nhập lý do, ≥ 5 ký tự) và `Xem lịch sử`. Nút từ chối **ẩn** với bản của chính người đang đăng nhập (`WFH_CANNOT_REJECT_OWN`).
- Thẻ số liệu trên đầu, tính theo tuần đang lọc: `Đã đăng ký` (số nhân viên) · `Tổng lượt WFH` · `Chờ duyệt` · `Từ chối`.
- Nút `Xuất Excel` theo đúng bộ lọc đang áp.

---

## 9. Thông báo

WFH **không** đẩy từng bản đăng ký vào Google Chat — mỗi tuần vài chục bản thì space sẽ ngập. Chỉ dùng thông báo in-app:

| Sự kiện | Người nhận | Nội dung |
|---|---|---|
| `wfh.rejected` | Nhân viên | `Đăng ký WFH tuần {tuần} bị từ chối: {lý do}` |
| `wfh.locked` | Nhân viên đã đăng ký | `Đăng ký WFH tuần {tuần} đã được duyệt` |
| `wfh.deadline_soon` | Nhân viên **chưa** đăng ký | Gửi sáng chủ nhật: `Hôm nay là hạn đăng ký WFH cho tuần {tuần}` |

Xem §13 câu 3 về bản tổng hợp tuần gửi vào Google Chat.

---

## 10. i18n

```jsonc
"wfh": {
  "title": "Đăng ký WFH",
  "tabs": { "mine": "Của tôi", "all": "Toàn công ty" },
  "nextWeekCard": {
    "title": "Đăng ký WFH tuần sau",
    "week": "Tuần {isoWeek} · {from} – {to}",
    "selected": "Đã chọn {count}/{max} ngày",
    "deadline": "Sửa được tới {time}",
    "deadlineCountdown": "Còn {duration}",
    "locked": "Tuần này đã khoá lúc {time}.",
    "registeredAt": "Đã đăng ký lúc {time} · đã sửa {count} lần",
    "viewHistory": "Xem lịch sử thay đổi",
    "notEnoughDays": "Tuần này không đủ ngày hợp lệ để đăng ký WFH"
  },
  "blockedReason": {
    "holiday": "Nghỉ lễ: {name}",
    "mandatory_office": "Ngày bắt buộc có mặt tại văn phòng",
    "maxReached": "Tối đa {max} ngày mỗi tuần"
  },
  "status": {
    "awaiting_approval": "Chờ duyệt",
    "approved": "Đã duyệt",
    "rejected": "Từ chối"
  },
  "weekday": { "1": "T2", "2": "T3", "3": "T4", "4": "T5", "5": "T6" },
  "fields": {
    "employee": "Nhân viên",
    "department": "Phòng ban",
    "week": "Tuần",
    "days": "Ngày WFH",
    "dayCount": "Số ngày",
    "note": "Ghi chú",
    "rejectReason": "Lý do từ chối",
    "lastUpdated": "Cập nhật lần cuối"
  },
  "actions": {
    "save": "Lưu",
    "update": "Cập nhật",
    "withdraw": "Huỷ đăng ký",
    "reject": "Từ chối",
    "confirmReject": "Xác nhận từ chối"
  },
  "stats": {
    "registered": "Đã đăng ký",
    "totalDays": "Tổng lượt WFH",
    "pending": "Chờ duyệt",
    "rejected": "Từ chối"
  },
  "log": {
    "created": "{actor} đã đăng ký",
    "updated": "{actor} đã sửa",
    "withdrawn": "{actor} đã huỷ đăng ký",
    "locked": "Hệ thống đã khoá tuần · chuyển sang Đã duyệt",
    "rejected": "{actor} đã từ chối",
    "resubmitted": "{actor} đã đăng ký lại",
    "diff": "bỏ {removed}, thêm {added}"
  },
  "errors": {
    "weekLocked": "Tuần này đã khoá, không sửa được nữa",
    "reasonRequired": "Vui lòng nhập lý do từ chối",
    "cannotRejectOwn": "Không thể từ chối đăng ký của chính mình"
  }
}
```

---

## 11. Cấu trúc Frontend

```
app/[locale]/(protected)/requests/wfh/
├── page.tsx                      # 2 tab: Của tôi | Toàn công ty
└── [id]/page.tsx                 # Chi tiết + lịch sử thay đổi

components/pages/requests/wfh/
├── wfh-next-week-card.tsx        # Khối đăng ký tuần sau (§8.1)
├── wfh-day-picker.tsx            # Hàng 5 chip T2–T6, render theo WfhWeekInfo
├── wfh-deadline-countdown.tsx    # Đồng hồ đếm ngược tới hạn sửa
├── wfh-history-timeline.tsx      # Lịch sử thay đổi, dựng từ days_before/after
├── wfh-my-table.tsx              # Bảng tab "Của tôi"
├── wfh-company-table.tsx         # Bảng tab "Toàn công ty"
├── wfh-company-filters.tsx       # Lọc tuần / trạng thái / nhân viên / phòng ban
├── wfh-week-picker.tsx           # Chọn tuần cho bộ lọc
├── wfh-reject-dialog.tsx         # Dialog nhập lý do từ chối
├── wfh-status-badge.tsx
└── wfh-stats.tsx

lib/types/wfh.ts
lib/services/wfh-service.ts
lib/constants/wfh.ts              # WFH_STATUSES, nhãn thứ — KHÔNG chứa "thứ 5 bị khoá"
lib/validations/wfh.schema.ts     # zod, đọc giới hạn từ WfhPolicy
lib/helpers/wfh-week.ts           # getIsoWeek, formatWeekRange, diffDays cho log
hooks/queries/wfh/
├── use-wfh-policy.ts
├── use-wfh-next-week.ts          # GET /wfh/weeks/next
├── use-my-next-week-registration.ts
├── use-wfh-registrations.ts
└── use-wfh-mutations.ts          # upsert / withdraw / reject
```

**React Query keys:**

```ts
['wfh', 'policy']
['wfh', 'next-week']
['wfh', 'my-next-week']
['wfh', 'list', params]
['wfh', 'detail', id]
```

Sau mỗi mutation: invalidate `['wfh']`.

---

## 12. Trường hợp biên

| Tình huống | Xử lý |
|---|---|
| Nhân viên mở form đúng lúc 23:59 chủ nhật rồi bấm lưu lúc 00:00 | BE trả `WFH_WEEK_LOCKED`; FE toast + chuyển read-only + refetch. Không im lặng nuốt thao tác. |
| Cả tuần sau là tuần lễ dài, không còn ngày hợp lệ | R7 — hiện thông báo, ẩn nút gửi. |
| Tuần sau chỉ còn đúng 1 ngày hợp lệ | Vẫn đăng ký được (tối thiểu 1). Bộ đếm hiện `1/2` với dòng phụ *"Tuần này chỉ còn 1 ngày hợp lệ"*. |
| BO từ chối sau khi tuần đã khoá | Cho phép, miễn tuần chưa kết thúc. Nhân viên nhận thông báo in-app ngay. |
| BO từ chối rồi nhân viên muốn sửa | Chỉ sửa được nếu **chưa qua hạn sửa**. Qua rồi thì `rejected` là trạng thái cuối. |
| Nhân viên vào công ty giữa tuần | Vẫn đăng ký được cho tuần sau như mọi người. |
| Nhân viên đã nghỉ việc nhưng còn bản đăng ký tuần sau | BO thấy trong danh sách và từ chối; record giữ lại để tra cứu. |
| Ngày lễ được công bố **sau** khi nhân viên đã đăng ký trúng ngày đó | BE đánh dấu ngày đó `invalid` trên bản đăng ký, gửi thông báo in-app cho nhân viên và mở lại quyền sửa nếu chưa qua hạn. Nếu đã qua hạn → chỉ thông báo, không tự xoá ngày. |
| `GET /wfh/policy` lỗi | Chặn form, hiện lỗi. Không đoán giá trị mặc định (§3.2). |
| Hai tab cùng sửa một bản đăng ký | Lần lưu sau thắng; action log ghi cả hai lần nên vẫn truy được. |

---

## 13. Câu hỏi cần chốt

1. **Ai cấu hình chính sách WFH?** Spec để `max_days_per_week`, `blocked_weekdays`, hạn sửa nằm trong `GET /wfh/policy` do BO chỉnh. Cần màn cấu hình riêng, hay tạm thời để BE set cứng trong config và FE chỉ đọc?
2. **Ngày lễ lấy ở đâu?** WFH cần bảng ngày nghỉ lễ (R4) — đây cũng là câu hỏi số 7 còn treo ở spec chính. Nếu chưa có bảng này thì R4 không chạy được, phải làm trước.
3. **Bản tổng hợp tuần vào Google Chat.** Có muốn sáng thứ 2 bot đẩy một card *"Tuần này ai WFH ngày nào"* vào space không? Hiện spec chỉ dùng thông báo in-app (§9).
4. **Giao diện dạng lưới cho BO/DD.** Ngoài bảng ở §8.3, một lưới `nhân viên × T2–T6` của cả tuần sẽ dễ nhìn hơn nhiều khi cần biết ngày nào vắng bao nhiêu người. Có muốn bổ sung không? Chưa vẽ vì bạn chưa yêu cầu.
5. **Hạn mức theo phòng ban.** Có cần luật kiểu *"mỗi ngày tối đa 30% quân số phòng ban được WFH"* không? Nếu có thì phải kiểm tra chéo giữa các nhân viên lúc đăng ký, ảnh hưởng lớn tới thiết kế API.
6. **Nhân viên không đăng ký** thì mặc định là lên văn phòng cả tuần — đúng chứ? Spec đang giả định vậy, không tạo bản ghi rỗng.
