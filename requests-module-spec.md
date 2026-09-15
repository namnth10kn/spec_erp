# Spec — Module Đơn từ ▸ Đơn xin nghỉ phép

| | |
|---|---|
| **Module key** | `requests` (giữ nguyên trong code; "Đơn từ" là nhãn hiển thị) |
| **Phạm vi file này** | Phần dùng chung của module + **Đơn xin nghỉ phép** (`/requests/leave`) |
| **Trạng thái tài liệu** | Draft v4 |
| **Ngày tạo** | 2026-09-15 |
| **Phạm vi** | Frontend (Next.js App Router) + hợp đồng API với BE |
| **Ticket gốc** | TBD |

> ## 📄 Đăng ký WFH có spec riêng
>
> Mục con **Đơn từ ▸ Đăng ký WFH** (`/requests/wfh`) được tách sang
> **[`requests-wfh-spec.md`](./requests-wfh-spec.md)**.
>
> Lý do tách: WFH **không** dùng chung mô hình dữ liệu với đơn xin nghỉ phép. Nó là
> bản đăng ký **theo tuần** gồm một tập ngày rời rạc (tối đa 2 ngày, không được chọn
> ngày lễ và ngày bắt buộc lên văn phòng), chỉ đăng ký cho tuần kế tiếp, sửa được tới
> 23:59 chủ nhật, **không qua bước duyệt**. Ép chung vào `RequestRes` sẽ khiến gần hết
> các trường phải nullable.
>
> **Ngoại lệ:** sau khi tuần đã khoá, nhân viên tạo **đơn xin WFH sau hạn**
> (`type = 'late_wfh'`). Đơn đó chạy trên `RequestRes` của file này, người duyệt là
> **HR** (không phải quản lý trực tiếp). Chi tiết ở spec WFH §3.5.
>
> **File này áp dụng cho đơn xin nghỉ phép + đơn sau hạn (`late_wfh`).** Những gì
> đăng ký tuần dùng chung: permission module (§4), cách sinh số đơn (§6.1), org-chart,
> action log, thông báo in-app (§8.4), và điều hướng sidebar (§10.2, §11.1).

**Thay đổi ở v4**

- **Tách WFH ra file spec riêng** — xem khung trên. File này từ đây đặc tả đơn xin nghỉ phép + phần dùng chung + type `late_wfh` (đơn xin WFH sau hạn, duyệt bởi HR).

**Thay đổi ở v3**

- **Đổi tên module: "Đề xuất" → "Đơn từ".** Mọi nhãn hiển thị dùng "đơn" thay cho "đề xuất"; "Người đề xuất" → "Người làm đơn"; "Số đề xuất" → "Số đơn".
- **Tách thành 2 màn danh sách riêng.** "Đơn từ" trên sidebar là menu cha bung ra 2 mục con: **Đơn xin nghỉ phép** (`/requests/leave`) và **Đăng ký WFH** (`/requests/wfh`) — §10.1, §11.1.
- **Bỏ bước chọn loại đơn trong form.** Loại đơn suy ra từ route, không còn 2 card chọn ở đầu form — §11.2.
- Mỗi màn có bộ thẻ số liệu và bộ lọc riêng phù hợp với loại đơn của nó.

**Thay đổi ở v2**

- **Bỏ hoàn toàn việc gửi email.** Kênh thông báo là **Google Chat** (space nội bộ) + thông báo in-app — §8 viết lại toàn bộ.
- **Người duyệt = quản lý cấp trên trực tiếp**, hệ thống tự xác định, không còn là ô để người dùng chọn — §7.3.
- **Người theo dõi có thể là nhiều người**, mặc định nhóm HR — §7.3.
- **Số liên hệ khi nghỉ prefill từ hồ sơ nhân viên** (`EmployeeRes.phone`) — §6.4 (mục mới).
- Thêm endpoint gộp `GET /requests/form-defaults` trả về mọi giá trị tự điền — §9.

---

## 1. Bối cảnh & Mục tiêu

Hiện tại nhân viên gửi các đơn cá nhân (xin nghỉ, xin làm việc tại nhà) bằng **email thủ công**, soạn tay theo một template cố định. Cách làm này có các vấn đề:

- Số đơn (`Proposal Number`) do người gửi tự đánh, dễ trùng / sai thứ tự.
- Không có nơi tra cứu lịch sử: ai đã nghỉ bao nhiêu, còn bao nhiêu phép.
- Người duyệt (quản lý trực tiếp) và HR phải tự theo dõi trong hộp thư — email dễ trôi, không ai biết đơn đã được xử lý hay chưa.
- Không liên kết được với dữ liệu chấm công / báo cáo công việc đã có trong ERP.

**Mục tiêu:** số hoá luồng đơn này thành một module trong ERP: nhân viên điền form, hệ thống sinh số đơn, **đẩy thông báo vào Google Chat của công ty** cho người duyệt và những người theo dõi, và quản lý toàn bộ trạng thái duyệt ngay trong ERP.

> **Thay đổi so với hiện tại — không gửi email nữa.** Kênh thông báo duy nhất là **Google Chat** (space nội bộ) cộng với thông báo in-app. Toàn bộ thông tin trong email cũ vẫn được giữ nguyên, nhưng hiển thị dưới dạng **card Google Chat** thay vì thân email. Xem §8.

### Nguyên tắc thiết kế

1. **Thông báo là output, không phải input.** Người dùng điền form trong ERP → hệ thống dựng card Google Chat và gửi vào space. Người dùng không bao giờ phải tự gõ nội dung thông báo.
2. **Một đơn = một thread.** Mọi cập nhật (duyệt / từ chối / yêu cầu chỉnh sửa / huỷ) đều reply vào đúng thread của đơn đó, để cả space nhìn thấy trọn vẹn diễn biến ở một chỗ.
3. **Không bắt người dùng nhập lại thứ đã có.** Người làm đơn, người duyệt và số điện thoại liên hệ đều tự điền từ dữ liệu sẵn có trong ERP (§7.3, §6.4).
4. **Mở rộng được.** Đơn xin nghỉ phép là loại đầu tiên chạy trên `RequestRes`; kiến trúc phải cho phép thêm loại mới có cùng hình dạng (OT, công tác, tạm ứng…) mà không sửa core. Loại nào có hình dạng khác hẳn — như WFH — thì tách entity riêng thay vì bẻ cong model chung.
5. **Bám convention repo.** Tái sử dụng `apiClient`, `PERMISSION_MATRIX`, `DataTable`, `next-intl`, `react-hook-form + zod` như các module đang có.

---

## 2. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| **Request / Đơn** | Một bản ghi đơn do nhân viên tạo (thay cho 1 email thủ công hiện tại). |
| **Proposer / Người làm đơn** | Nhân viên tạo đơn. **Luôn là user đang đăng nhập**, không chọn được người khác. |
| **Approver / Người duyệt** | **Quản lý cấp trên trực tiếp** của người làm đơn, lấy từ org-chart. Không phải ô để người dùng tự chọn — xem §7.3. |
| **Watcher / Người theo dõi** | Những người được nhắc tên (@mention) trong thông báo Google Chat để nắm thông tin nhưng **không có quyền duyệt**. **Có thể có nhiều người**; mặc định là HR, người làm đơn thêm/bớt được. |
| **Space** | Không gian Google Chat nội bộ mà mọi đơn được đẩy vào. |
| **Thread** | Chuỗi hội thoại của một đơn trong space; mọi cập nhật trạng thái reply vào đây. |
| **Proposal Number** | Mã đơn, format `{SEQ}/{MMYY}/{FULLNAME_UPPER}`. |
| **Duration** | Thời lượng nghỉ: cả ngày, nửa ngày, hoặc theo giờ. |

---

## 3. Phạm vi

### 3.1 Trong phạm vi (v1)

- Tạo / sửa / xoá (soft delete) / gửi duyệt đơn.
- Hai loại đơn trên `RequestRes`: **Xin nghỉ phép (Leave of Absence)** và **Xin WFH sau hạn (`late_wfh`)**. Đăng ký WFH theo tuần nằm ở [`requests-wfh-spec.md`](./requests-wfh-spec.md).
- Sinh tự động `Proposal Number`.
- Luồng duyệt 1 cấp: Proposer → Approver (Duyệt / Từ chối / Yêu cầu chỉnh sửa).
- **Gửi thông báo vào Google Chat** (space nội bộ) dưới dạng card, @mention người duyệt và người theo dõi; mọi cập nhật trạng thái reply vào cùng thread.
- Thông báo in-app (tái sử dụng `notification-service`).
- Danh sách đơn của tôi + hộp thư chờ duyệt (`Pending my approval`).
- Xem chi tiết + lịch sử thao tác (action log), tương tự `contract-action-log`.
- Đính kèm file (tái sử dụng `ListFileRecords` / `media-service`).
- Export CSV danh sách.

### 3.2 Ngoài phạm vi (v1 — ghi nhận cho v2)

- Tính & trừ quỹ phép năm tự động (chỉ **hiển thị** số dư nếu BE cung cấp, không tính toán ở FE).
- Duyệt nhiều cấp / uỷ quyền duyệt khi approver vắng mặt.
- Đồng bộ với máy chấm công, Google Calendar.
- Loại đơn khác ngoài nghỉ phép và WFH sau hạn (OT, công tác, tạm ứng…).
- **Duyệt ngay trong Google Chat** (bấm nút Duyệt/Từ chối trên card). v1 card chỉ có nút `Xem chi tiết` mở về ERP; duyệt vẫn làm trong ERP.
- Gửi DM riêng cho người duyệt (v1 chỉ đẩy vào space chung).
- Gửi email — **đã bỏ hoàn toàn**, không còn trong mọi phiên bản.

---

## 4. Vai trò & Phân quyền

Thêm `requests: 'requests'` vào `Modules` trong `lib/constants/role-permissions.ts`, và bổ sung entry `requests` vào **mọi** object trong `PERMISSION_MATRIX` + `DEFAULT_PERMISSION_MATRIX` (TypeScript sẽ báo lỗi nếu thiếu — theo đúng hướng dẫn ở đầu file đó).

| Position | access | read | create | edit | delete | export | Ghi chú |
|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| `ceo` | ✅ | ✅ (toàn công ty) | ✅ | ✅ | ✅ | ✅ | |
| `bo_division` + job_role `hr` | ✅ | ✅ (toàn công ty) | ✅ | ✅ | ✅ | ✅ | Người theo dõi mặc định; được `Đổi người duyệt` |
| `delivery_division`, `delivery_leader`, `team_leader`, `tech_lead` | ✅ | ✅ (của mình + cấp dưới) | ✅ | ✅ (của mình) | ✅ (của mình, khi `draft`) | ✅ | Là approver |
| `team_member` và các vị trí còn lại | ✅ | ✅ (chỉ của mình) | ✅ | ✅ (của mình) | ✅ (của mình, khi `draft`) | ❌ | |

**Quy tắc bổ sung (record-level, kiểm tra ở cả UI và handler):**

- Chỉ **proposer** được `edit` khi trạng thái ∈ `{draft, changes_requested}`.
- Chỉ **approver được chỉ định** (hoặc CEO / HR) mới thấy nút `Approve` / `Reject` / `Request changes`.
- `delete` chỉ áp dụng cho `draft`. Đơn đã gửi thì dùng `cancel` (huỷ), không xoá.
- Không ai được duyệt đơn của chính mình (kể cả CEO — CEO gửi thì approver là người được cấu hình, xem §7.3).

> Màn hình **không bao giờ** chỉ dựa vào việc ẩn nút. Handler phía sau nút và route `/requests/[id]/edit` phải check lại cùng một permission (đúng nguyên tắc đã ghi trong `role-permissions.ts`).

---

## 5. Mô hình dữ liệu

### 5.1 Enum

```ts
// lib/constants/requests.ts
/**
 * Đăng ký WFH theo tuần KHÔNG nằm trong enum này — entity riêng (requests-wfh-spec.md).
 * `late_wfh` là đơn xin WFH *sau hạn*, chạy trên RequestRes, duyệt bởi HR.
 * Giữ mảng để kiến trúc còn chỗ cho loại đơn mới (OT, công tác…).
 */
export const REQUEST_TYPES = ['leave_of_absence', 'late_wfh'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

/** Chi tiết loại nghỉ — chỉ áp dụng khi type = 'leave_of_absence'. */
export const LEAVE_CATEGORIES = [
  'annual_leave',       // Nghỉ phép năm (trừ quỹ phép)
  'unpaid_leave',       // Nghỉ không lương
  'sick_leave',         // Nghỉ ốm (nên đính kèm giấy tờ)
  'personal_leave',     // Nghỉ việc riêng
  'compensatory_leave', // Nghỉ bù
] as const;
export type LeaveCategory = (typeof LEAVE_CATEGORIES)[number];

/** Đơn vị thời lượng. */
export const REQUEST_DURATION_UNITS = ['full_day', 'half_day', 'hours'] as const;
export type RequestDurationUnit = (typeof REQUEST_DURATION_UNITS)[number];

/** Buổi — chỉ áp dụng khi unit = 'half_day'. */
export const HALF_DAY_SESSIONS = ['morning', 'afternoon'] as const;
export type HalfDaySession = (typeof HALF_DAY_SESSIONS)[number];

export const REQUEST_STATUSES = [
  'draft',
  'pending',
  'changes_requested',
  'approved',
  'rejected',
  'cancelled',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
```

### 5.2 Entity — `RequestRes` (`lib/types/request.ts`)

```ts
export interface RequestRes extends ListFileRecords {
  id: number;
  proposal_number: string;          // "02/0926/NGUYENTHEHOAINAM"
  proposal_date: string;            // ISO date — ngày lập đơn
  type: RequestType;
  leave_category?: LeaveCategory | null;   // bắt buộc khi type = leave_of_absence; null với late_wfh
  status: RequestStatus;
  /** Chỉ có khi type = 'late_wfh' — thứ 2 của tuần đang xin. */
  wfh_week_start?: string | null;
  /** Chỉ có khi type = 'late_wfh' — các ngày WFH rời rạc. */
  wfh_dates?: string[] | null;

  // Người liên quan
  proposer_id: number;              // luôn = user đang đăng nhập lúc tạo
  proposer?: RequestUserRef | null;
  approver_id: number;              // quản lý trực tiếp, BE resolve từ org-chart
  approver?: RequestUserRef | null;
  watcher_ids?: number[];           // nhiều người theo dõi — mặc định HR
  watchers?: RequestUserRef[];

  // Nội dung
  subject: string;                      // sinh từ type, cho phép override
  reason: string;                       // mục đích và lý do
  replacement_plan?: string | null;     // kế hoạch bàn giao (nếu có)
  contact_during_leave?: string | null; // SĐT liên hệ — prefill từ EmployeeRes.phone (§6.4)

  // Thời lượng
  duration_unit: RequestDurationUnit;
  start_date: string;               // ISO date
  end_date: string;                 // ISO date — = start_date nếu half_day/hours
  half_day_session?: HalfDaySession | null; // khi unit = half_day
  start_time?: string | null;       // "15:30" — khi unit = hours
  end_time?: string | null;         // "17:30" — khi unit = hours
  total_days?: number | null;       // BE tính, FE chỉ hiển thị
  total_hours?: number | null;      // BE tính, FE chỉ hiển thị

  // Kết quả duyệt
  submitted_at?: string | null;
  decided_at?: string | null;
  decided_by?: number | null;
  decision_note?: string | null;    // lý do từ chối / ghi chú của người duyệt

  // Thông báo Google Chat (§8)
  chat_space_name?: string | null;   // "spaces/AAAA…" — space đã gửi vào
  chat_thread_name?: string | null;  // "spaces/AAAA…/threads/BBBB…" — mọi cập nhật reply vào đây
  chat_message_name?: string | null; // message gốc, dùng để update card khi đổi trạng thái
  notify_status?: 'pending' | 'sent' | 'failed';
  notified_at?: string | null;
  notify_error?: string | null;      // hiển thị khi notify_status = 'failed'

  // Audit
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  deleted_by?: number | null;

  action_logs?: RequestActionLog[];
}

export interface RequestUserRef {
  id: number;
  full_name: string;
  email: string;
  position_code?: string | null;
  avatar_url?: string | null;
}

export interface RequestActionLog {
  id: number;
  request_id: number;
  action: 'created' | 'submitted' | 'approved' | 'rejected' | 'changes_requested' | 'cancelled' | 'updated';
  note?: string | null;
  actor?: RequestUserRef | null;
  created_at: string;
}

export interface RequestsMeta extends PaginationMeta {
  pending_count?: number;      // số đơn đang chờ tôi duyệt
  my_pending_count?: number;   // số đơn của tôi đang chờ duyệt
}
```

### 5.3 Payload

```ts
export interface CreateRequestPayload {
  type: RequestType;
  leave_category?: LeaveCategory;
  proposal_date: string;
  subject?: string;
  reason: string;
  replacement_plan?: string;
  contact_during_leave?: string;
  duration_unit: RequestDurationUnit;
  start_date: string;
  end_date: string;
  half_day_session?: HalfDaySession;
  start_time?: string;
  end_time?: string;
  /**
   * KHÔNG gửi từ form thường. BE tự resolve quản lý trực tiếp của user đang
   * đăng nhập (§7.3). Chỉ chấp nhận khi người gọi là HR/CEO và cần chỉ định
   * người duyệt thay thế; mọi trường hợp khác BE bỏ qua giá trị này.
   */
  approver_id?: number;
  /** Nhiều người theo dõi. Bỏ trống → BE tự điền nhóm HR mặc định. */
  watcher_ids?: number[];
  file_ids?: number[];
  /** true → tạo và gửi duyệt luôn; false → lưu nháp. */
  submit?: boolean;
  /** Bắt buộc khi type = 'late_wfh'. FE không gửi week_start — BE gắn tuần đang khoá. */
  wfh_dates?: string[];
}

export type UpdateRequestPayload = Partial<CreateRequestPayload>;

export interface RequestDecisionPayload {
  note?: string;   // bắt buộc khi reject / request changes
}

export interface QueryParamsRequest extends QueryParams {
  search?: string;             // theo proposal_number / proposer / reason
  type?: RequestType;
  leave_category?: LeaveCategory;
  status?: RequestStatus | RequestStatus[];
  proposer_id?: number;
  approver_id?: number;
  department_id?: number;
  from_date?: string;
  to_date?: string;
  scope?: 'mine' | 'to_approve' | 'all';   // tab trên UI
  sort_by?: 'proposal_date' | 'start_date' | 'created_at' | 'status';
  sort_order?: 'asc' | 'desc';
}
```

---

## 6. Quy tắc nghiệp vụ

### 6.1 Sinh `Proposal Number`

Format: **`{SEQ}/{MMYY}/{FULLNAME_UPPER}`** — ví dụ `02/0926/NGUYENTHEHOAINAM`.

| Thành phần | Quy tắc |
|---|---|
| `SEQ` | Số thứ tự đơn của **chính người đó** trong **tháng đó**, bắt đầu từ `01`, pad 2 chữ số (`01`…`99`, quá 99 thì 3 chữ số). |
| `MMYY` | Tháng + 2 số cuối của năm theo `proposal_date`. `11/09/2026` → `0926`. |
| `FULLNAME_UPPER` | Họ tên đầy đủ, **bỏ dấu tiếng Việt**, **bỏ khoảng trắng**, **viết hoa toàn bộ**. `Nguyễn Thế Hoài Nam` → `NGUYENTHEHOAINAM`. |

- Số này do **BE sinh** (endpoint `POST /requests/generate-proposal-number`) để tránh race condition; FE gọi khi user mở form hoặc đổi `proposal_date`, hiển thị **read-only**.
- Chỉ "chốt" số khi đơn được **submit**. Bản nháp giữ số tạm và có thể được đánh lại nếu sang tháng mới.
- FE vẫn implement helper `buildProposalNumber()` thuần hàm để preview và để viết test.

### 6.2 Thời lượng

| `duration_unit` | Trường bắt buộc | Ràng buộc |
|---|---|---|
| `full_day` | `start_date`, `end_date` | `end_date >= start_date`; `total_days` = số ngày làm việc (BE tính, loại trừ T7/CN + ngày lễ). |
| `half_day` | `start_date`, `half_day_session` | `end_date = start_date`; `total_days = 0.5`. |
| `hours` | `start_date`, `start_time`, `end_time` | `end_date = start_date`; `end_time > start_time`; `total_hours` = chênh lệch, làm tròn 0.5h; tối đa 8h (quá 8h phải chọn `full_day`). |

### 6.3 Validation (zod — `lib/validations/request.schema.ts`)

| Trường | Rule |
|---|---|
| `type` | Bắt buộc, ∈ `REQUEST_TYPES`. |
| `leave_category` | Bắt buộc khi `type = leave_of_absence`. Cấm gửi khi `type = late_wfh`. |
| `reason` | Bắt buộc, 5–500 ký tự, trim. |
| `proposal_date` | Bắt buộc, không được ở tương lai quá 7 ngày. |
| `start_date` | Bắt buộc. Cảnh báo (không chặn) nếu ở quá khứ → nhắc người dùng bổ sung lý do nộp muộn vào `reason`. |
| `contact_during_leave` | Prefill từ hồ sơ (§6.4). Bắt buộc; regex SĐT VN `^(0\|\+84)\d{9,10}$`. |
| `replacement_plan` | Optional, ≤ 500 ký tự. Hiển thị `Không có` trong card Chat nếu rỗng. |
| `approver_id` | FE không validate — BE resolve và đảm bảo `!== proposer_id` (§7.3). |
| `file_ids` | ≤ 5 file, mỗi file ≤ 10MB. **Bắt buộc ≥ 1 file** khi `leave_category = sick_leave` và `total_days >= 3`. |
| `wfh_dates` | Bắt buộc khi `type = late_wfh`. Quy tắc ngày: spec WFH §3.5. `start_date`/`end_date` do BE suy ra từ min/max của mảng này. |

**Cảnh báo mềm (soft warning, không block submit):**

- Đơn nghỉ nộp muộn hơn ngày bắt đầu (`start_date < today`).
- `annual_leave` vượt số dư phép năm còn lại (nếu BE trả `leave_balance`).

**Chặn cứng:** trùng khoảng thời gian với một đơn `pending`/`approved` khác của cùng người → báo lỗi kèm `proposal_number` bị trùng.

### 6.4 Các trường tự điền (người dùng không phải gõ)

Bốn trường dưới đây **không phải ô nhập tự do**. FE lấy về trong một lần gọi `GET /requests/form-defaults` khi mở form (§9) và hiển thị ở dạng đã điền sẵn:

| Trường | Nguồn | Người dùng sửa được? |
|---|---|---|
| Người làm đơn | User đang đăng nhập (`useAuth()`) | **Không.** Hiển thị read-only, nền `muted`. |
| Người duyệt | Quản lý cấp trên trực tiếp theo org-chart (§7.3). Với `late_wfh`: **HR**. | **Không** với nhân viên thường. Hiển thị read-only kèm chức danh. Chỉ HR/CEO thấy nút `Đổi người duyệt`. |
| Liên hệ khi nghỉ | `EmployeeRes.phone` của người làm đơn (`lib/types/employee.ts`) | **Có**, nhưng mặc định là ô read-only kèm link `Dùng số khác` để mở ra sửa. Sửa ở đây **không** ghi ngược vào hồ sơ nhân viên. |
| Người theo dõi | Nhóm HR mặc định (§7.3 bước 5) | **Có** — multi-select, thêm/bớt được **nhiều người**. |

**Khi `phone` trong hồ sơ trống:** ô liên hệ mở ở trạng thái nhập tự do, kèm dòng gợi ý *"Hồ sơ của bạn chưa có số điện thoại — cập nhật tại Hồ sơ để lần sau tự điền."* có link tới `/profile`.

---

## 7. Luồng trạng thái & Duyệt

### 7.1 State machine

```
                    ┌──────────────── edit ─────────────────┐
                    ▼                                       │
  [draft] ──submit──► [pending] ──request_changes──► [changes_requested]
     │                   │  │                                │
   delete                │  └──────── reject ──────────► [rejected]  (final)
     │                   │
     ▼                   └──────── approve ─────────► [approved]
  (xoá mềm)

  [pending] / [changes_requested] / [approved] ──cancel──► [cancelled]
  (approved chỉ huỷ được khi start_date > today)
```

| Từ | Hành động | Đến | Ai được làm |
|---|---|---|---|
| `draft` | `submit` | `pending` | Proposer |
| `draft` | `delete` | (soft deleted) | Proposer, CEO, HR |
| `pending` | `approve` | `approved` | Approver, CEO |
| `pending` | `reject` (bắt buộc note) | `rejected` | Approver, CEO |
| `pending` | `request_changes` (bắt buộc note) | `changes_requested` | Approver, CEO |
| `pending` | `cancel` | `cancelled` | Proposer |
| `changes_requested` | `submit` (sau khi sửa) | `pending` | Proposer |
| `changes_requested` | `cancel` | `cancelled` | Proposer |
| `approved` | `cancel` | `cancelled` | Proposer (chỉ khi `start_date > today`), HR, CEO |

`rejected` là trạng thái cuối — muốn xin lại thì tạo đơn mới (có nút **Nhân bản** để copy nội dung sang bản nháp mới).

### 7.2 Badge màu (đồng bộ với `contract-document-status-badge.tsx`)

| Status | Màu | Nhãn VI | Nhãn EN |
|---|---|---|---|
| `draft` | xám | Nháp | Draft |
| `pending` | vàng/amber | Chờ duyệt | Pending |
| `changes_requested` | cam | Yêu cầu chỉnh sửa | Changes requested |
| `approved` | xanh lá | Đã duyệt | Approved |
| `rejected` | đỏ | Từ chối | Rejected |
| `cancelled` | xám nhạt, gạch ngang | Đã huỷ | Cancelled |

### 7.3 Xác định người duyệt

**Người duyệt luôn do hệ thống gán, không phải lựa chọn của người dùng** — form không có combobox chọn người duyệt (trừ nút đổi của HR/CEO).

**Đơn xin nghỉ phép (`leave_of_absence`):** người duyệt là **quản lý cấp trên trực tiếp**.

1. BE lấy quản lý trực tiếp của proposer từ **org-chart** (`org-chart-service`) và gán vào `approver_id`.
2. Nếu không có (proposer là CEO hoặc org-chart thiếu dữ liệu) → fallback sang người có `position_code = 'ceo'`.
3. Nếu người resolve được lại chính là proposer → nhảy lên một cấp nữa (không ai tự duyệt đơn của mình).
4. Nếu cả 3 bước trên đều không ra người hợp lệ → BE trả `REQUEST_NO_APPROVER`; FE chặn `Gửi duyệt` và hiện thông báo *"Chưa xác định được quản lý trực tiếp của bạn. Liên hệ HR để cập nhật sơ đồ tổ chức."*
5. FE **chỉ hiển thị** kết quả (read-only, kèm avatar + chức danh). Riêng HR/CEO có nút `Đổi người duyệt` mở combobox — dùng cho trường hợp quản lý trực tiếp nghỉ dài hạn.

**Đơn xin WFH sau hạn (`late_wfh`):** người duyệt là **HR** (`position_code = 'bo_division'` + `job_role = 'hr'`), không lấy quản lý trực tiếp. Nếu proposer chính là HR → fallback CEO. Chi tiết form và quy tắc ngày ở [`requests-wfh-spec.md`](./requests-wfh-spec.md) §3.5, §6.4.

**Người theo dõi (nhiều người):** mặc định là **tất cả** nhân viên `position_code = 'bo_division'` + `job_role = 'hr'` (hiện tại là Trần Thị Ngọc Hà). Người làm đơn thêm/bớt thoải mái — multi-select, không giới hạn cứng số lượng (khuyến nghị cảnh báo mềm khi > 10 người vì mỗi người là một @mention trong Google Chat). Người theo dõi **không có quyền duyệt**; họ chỉ được nhắc tên trong thông báo.

---

## 8. Thông báo Google Chat

**Không có email trong module này.** Kênh thông báo ra ngoài ERP duy nhất là Google Chat.

### 8.1 Mô hình gửi

| Hạng mục | Quyết định |
|---|---|
| **Đích đến** | Một **space Google Chat nội bộ** dùng chung cho toàn bộ đơn (ví dụ *"ERP · Đơn"*). Space này cấu hình một lần ở BE, FE chỉ đọc tên hiển thị để cho người dùng biết thông báo sẽ đi đâu. |
| **Cơ chế** | Google Chat app (bot) dùng service account gọi `spaces.messages.create`. **Không dùng incoming webhook** — webhook không @mention được người dùng và không sửa lại được message đã gửi, hai thứ luồng này đều cần. |
| **Ai gửi** | BE. FE **không bao giờ** gọi thẳng Google Chat API (sẽ lộ credential và bị CORS chặn). |
| **Khi nào gửi** | Đúng lúc `submit` (`draft` hoặc `changes_requested` → `pending`). Lưu nháp không gửi gì. |
| **Thread** | Message đầu tiên của một đơn mở một thread mới; BE lưu `chat_thread_name`. **Mọi cập nhật trạng thái sau đó reply vào chính thread đó** (`messageReplyOption: REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`). |
| **Card gốc** | Khi trạng thái đổi, BE `patch` lại message gốc để chip trạng thái trên card luôn đúng — người mở space sau vẫn thấy ngay đơn đã xử lý hay chưa, không phải đọc hết thread. |
| **@mention** | Người duyệt được mention ở dòng text phía trên card. Người theo dõi mention sau `cc:`. Mention dùng `<users/{user_id}>`, nên mỗi nhân viên cần map sang Google user id (§15). |

### 8.2 Nội dung message khi gửi duyệt

Một lần gửi gồm **một dòng text** (để phần @mention nảy thông báo) và **một card** (`cardsV2`).

**Dòng text:**

```
<users/112233> có một đơn cần bạn duyệt · cc <users/445566>
```

**Card — bố cục:**

```
┌──────────────────────────────────────────────────────┐
│ [avatar]  Xin nghỉ · Nghỉ việc riêng                 │  header.title
│           Nguyễn Thế Hoài Nam · 02/0926/NGUYENTHE…   │  header.subtitle
├──────────────────────────────────────────────────────┤
│  ⏱  Thời gian    11/09/2026 · 15h30 – 17h30 (2 giờ)  │
│  💬  Lý do        Personal reason                     │
│  🔁  Bàn giao     Không có                            │
│  📞  Liên hệ      0336243907                          │
│  📎  Đính kèm     Không có                            │
├──────────────────────────────────────────────────────┤
│  Chờ duyệt                        [ Xem chi tiết ]   │  chip + button
└──────────────────────────────────────────────────────┘
```

**Ánh xạ trường — giữ nguyên đủ thông tin của email cũ:**

| Trường trong email cũ | Vị trí trên card |
|---|---|
| `Subject` | `header.title` — `Xin nghỉ`, nối thêm loại nghỉ sau dấu `·` |
| `Proposer` | `header.subtitle` (nửa đầu) |
| `Proposal Number` | `header.subtitle` (nửa sau) |
| `Proposal Date` | Bỏ khỏi card — Google Chat đã hiển thị sẵn thời điểm gửi. Vẫn lưu trong DB và hiện ở màn chi tiết ERP. |
| `Leave Duration` | Dòng **Thời gian**, gộp cả khoảng ngày/giờ và tổng thời lượng |
| `Purpose and Reason` | Dòng **Lý do** |
| `Replacement Plan (if any)` | Dòng **Bàn giao**, rỗng → `Không có` |
| `Contact Information During Leave` | Dòng **Liên hệ** |
| `Attached Documents (if any)` | Dòng **Đính kèm**, rỗng → `Không có`; có file → tên file, mỗi file một link tải |
| `I kindly request … Thank you very much.` | **Bỏ.** Văn phong thư tín không hợp với chat; phần "nhờ duyệt" đã nằm ở dòng @mention. |

**Ngôn ngữ:** card viết **tiếng Việt**, đồng bộ với giao diện ERP mà mọi người dùng hằng ngày — khác với email cũ vốn viết tiếng Anh theo lệ thư tín. Nếu muốn giữ nguyên tiếng Anh, xem §15 câu 4.

### 8.3 Message cập nhật trạng thái (reply vào thread)

| Sự kiện | Nội dung reply |
|---|---|
| Duyệt | `✅ <users/…> đã duyệt đơn 02/0926/NGUYENTHEHOAINAM` |
| Từ chối | `❌ <users/…> đã từ chối · Lý do: {decision_note}` |
| Yêu cầu chỉnh sửa | `✏️ <users/…> yêu cầu chỉnh sửa · {decision_note}` |
| Huỷ | `🚫 <users/…> đã huỷ đơn` |
| Gửi lại sau khi sửa | `🔄 <users/…> đã cập nhật và gửi duyệt lại` — kèm lại card đã cập nhật |

Mỗi reply đồng thời `patch` chip trạng thái trên card gốc.

### 8.4 Thông báo in-app

Độc lập với Google Chat và **vẫn chạy kể cả khi Google Chat lỗi**. Tái sử dụng `notification-service` + `lib/constants/notifications.ts`:

| Sự kiện | Người nhận | Nội dung |
|---|---|---|
| `request.submitted` | approver | `{proposer} gửi đơn {subject} cần bạn duyệt` |
| `request.approved` | proposer, watchers | `Đơn {proposal_number} đã được duyệt` |
| `request.rejected` | proposer | `Đơn {proposal_number} bị từ chối` |
| `request.changes_requested` | proposer | `Đơn {proposal_number} cần chỉnh sửa` |
| `request.cancelled` | approver, watchers | `{proposer} đã huỷ đơn {proposal_number}` |

Badge số lượng `pending_count` hiển thị cạnh menu **Đơn** trên sidebar (giống pattern deadline alert đang có).

### 8.5 Khi gửi Google Chat thất bại

Gửi Chat là **side effect, không phải điều kiện** của việc chuyển trạng thái:

1. Đơn vẫn chuyển sang `pending`, `notify_status = 'failed'`, `notify_error` lưu message lỗi.
2. Thông báo in-app vẫn gửi bình thường → người duyệt vẫn biết có việc.
3. Màn chi tiết hiện dải cảnh báo vàng: *"Chưa gửi được thông báo vào Google Chat"* + nút `Gửi lại thông báo` (`POST /requests/:id/resend-notification`).
4. BE tự retry theo backoff tối đa 3 lần trước khi đánh `failed`.

---

## 9. Hợp đồng API

Base: `apiClient` (`lib/services/api-client.ts`). Response bọc trong `ResponseForm<T>`; danh sách kèm `meta`.

| Method | Endpoint | Payload / Params | Response |
|---|---|---|---|
| GET | `/requests` | `QueryParamsRequest` | `RequestRes[]` + `RequestsMeta` |
| GET | `/requests/:id` | — | `RequestRes` |
| POST | `/requests` | `CreateRequestPayload` | `RequestRes` |
| PATCH | `/requests/:id` | `UpdateRequestPayload` | `RequestRes` |
| DELETE | `/requests/:id` | — | `void` (soft delete, chỉ `draft`) |
| POST | `/requests/generate-proposal-number` | `{ proposal_date: string }` | `string` |
| POST | `/requests/:id/submit` | — | `RequestRes` |
| POST | `/requests/:id/approve` | `RequestDecisionPayload` | `RequestRes` |
| POST | `/requests/:id/reject` | `RequestDecisionPayload` (note bắt buộc) | `RequestRes` |
| POST | `/requests/:id/request-changes` | `RequestDecisionPayload` (note bắt buộc) | `RequestRes` |
| POST | `/requests/:id/cancel` | `RequestDecisionPayload` | `RequestRes` |
| POST | `/requests/:id/resend-notification` | — | `RequestRes` (kèm `notify_status` mới) |
| GET | `/requests/:id/action-logs` | — | `RequestActionLog[]` |
| GET | `/requests/pending-approval` | `QueryParams` | `RequestRes[]` + `RequestsMeta` |
| GET | `/requests/form-defaults` | — | `RequestFormDefaults` — xem dưới |
| GET | `/requests/leave-balance` | `{ year?: number }` | `{ annual_total, annual_used, annual_remaining }` |
| GET | `/requests/export` | `QueryParamsRequest & QueryParamsExport` | file blob (dùng `getFileBlob`) |

**`RequestFormDefaults`** — một lần gọi khi mở form, trả về đủ mọi thứ tự điền ở §6.4:

```ts
export interface RequestFormDefaults {
  proposer: RequestUserRef;
  /** Quản lý trực tiếp. null → FE chặn gửi duyệt, hiện hướng dẫn liên hệ HR. */
  approver: RequestUserRef | null;
  /** Nhóm HR mặc định — nhiều người. */
  watchers: RequestUserRef[];
  /** EmployeeRes.phone của người làm đơn. null → ô liên hệ mở tự do. */
  contact_phone: string | null;
  /** Space Google Chat sẽ nhận thông báo — chỉ để hiển thị cho người dùng biết. */
  chat_space: { name: string; display_name: string } | null;
  /** true khi người gọi là HR/CEO — FE mới hiện nút "Đổi người duyệt". */
  can_override_approver: boolean;
}
```

**Mã lỗi cần xử lý riêng ở FE:**

| Code | Ý nghĩa | Xử lý UI |
|---|---|---|
| `REQUEST_OVERLAPPED` | Trùng khoảng thời gian | Toast đỏ + highlight field ngày, hiện `proposal_number` trùng. |
| `REQUEST_INVALID_TRANSITION` | Trạng thái đã đổi ở tab/người khác | Toast + `invalidateQueries` để refetch. |
| `REQUEST_NOT_APPROVER` | Không có quyền duyệt | Toast + ẩn action bar. |
| `REQUEST_INVALID_APPROVER` | Quản lý trực tiếp đã nghỉ việc/inactive | Toast + hướng dẫn liên hệ HR; HR/CEO thấy nút `Đổi người duyệt`. |
| `REQUEST_NO_APPROVER` | Org-chart không xác định được quản lý trực tiếp | Chặn `Gửi duyệt`, hiện dải cảnh báo kèm link tới HR (§7.3 bước 4). |
| `REQUEST_CHAT_SEND_FAILED` | Gửi Google Chat thất bại | **Không** chặn luồng — đơn vẫn `pending`; hiện dải vàng + nút `Gửi lại thông báo` (§8.5). |

---

## 10. Cấu trúc Frontend

### 10.1 File mới

```
app/[locale]/(protected)/requests/
├── layout.tsx                    # Guard module + shell dùng chung cho cả 2 loại
├── leave/                        # ĐƠN XIN NGHỈ PHÉP
│   ├── page.tsx                  # Danh sách (tabs: Của tôi | Chờ tôi duyệt | Tất cả)
│   ├── create/page.tsx           # Tạo mới — type cố định = leave_of_absence
│   └── [id]/
│       ├── page.tsx              # Chi tiết
│       └── edit/page.tsx         # Sửa (draft | changes_requested)
└── wfh/                          # ĐĂNG KÝ WFH — xem requests-wfh-spec.md §9
    ├── page.tsx                  # 2 tab: Của tôi | Toàn công ty
    ├── [id]/page.tsx             # Chi tiết bản đăng ký tuần + lịch sử thay đổi
    └── late/
        ├── create/page.tsx       # Đơn xin WFH sau hạn
        └── [id]/page.tsx         # Chi tiết / duyệt đơn sau hạn (RequestRes)
```

> Nhánh `wfh/` **không có** `[id]/edit/` cho bản đăng ký tuần: upsert ngay trên màn
> danh sách: tick checkbox trên lưới tuần. Đơn sau hạn (`late_wfh`) có
> `late/create/` và `late/[id]/`, tái dùng component chi tiết đơn nghỉ. Chi tiết ở
> [`requests-wfh-spec.md`](./requests-wfh-spec.md).

> **Không có route `/requests` trần.** Truy cập thẳng `/requests` thì redirect sang
> `/requests/leave`. Hai nhánh dùng chung toàn bộ component bên dưới; khác nhau ở
> `type` truyền vào và ở cấu hình cột/thẻ số liệu của từng màn (§11.1).

```
components/pages/requests/
├── request-form.tsx              # Form dùng chung — nhận prop `type`, KHÔNG có bước chọn loại
├── request-duration-fields.tsx   # Nhóm field thời lượng (đổi theo duration_unit)
├── request-approver-field.tsx    # Người duyệt read-only + nút "Đổi người duyệt" cho HR/CEO
├── request-watchers-select.tsx   # Multi-select nhiều người theo dõi
├── request-contact-field.tsx     # SĐT prefill từ hồ sơ + link "Dùng số khác"
├── request-chat-preview.tsx      # Preview card Google Chat sẽ gửi (read-only)
├── request-notify-status-alert.tsx # Dải cảnh báo khi notify_status = 'failed'
├── request-status-badge.tsx
├── request-detail-card.tsx
├── request-action-bar.tsx        # Approve / Reject / Request changes / Cancel
├── request-decision-dialog.tsx   # Dialog nhập note khi reject / request changes
├── request-action-log-timeline.tsx
├── requests-table-columns.tsx    # Trả về bộ cột theo `type` (§11.1)
├── requests-toolbar.tsx          # Search + filter + export — bộ lọc khác nhau theo `type`
├── requests-stats.tsx            # Hàng thẻ số liệu — khác nhau theo `type`
└── leave-balance-card.tsx

lib/types/request.ts
lib/services/request-service.ts
lib/constants/requests.ts
lib/validations/request.schema.ts
lib/helpers/request-proposal-number.ts   # buildProposalNumber, removeVietnameseTones
lib/helpers/request-chat-card.ts         # buildRequestChatCard (dùng cho preview ở FE;
                                         # BE dựng lại card thật khi gửi — hai bên
                                         # phải khớp, xem §8.2)
hooks/queries/requests/
├── use-requests.ts
├── use-request.ts
├── use-request-mutations.ts
├── use-pending-approval-requests.ts
├── use-request-form-defaults.ts   # GET /requests/form-defaults (§6.4)
└── use-leave-balance.ts
```

### 10.2 File sửa

| File | Thay đổi |
|---|---|
| `lib/constants/role-permissions.ts` | Thêm `requests` vào `Modules` + mọi matrix. |
| `lib/helpers/module-access.ts` | Thêm mapping `getModuleForSidebarTitle('requests')`. |
| `lib/constants/sidebar.ts` | Thêm **menu cha có 2 con** (dùng đúng shape `SidebarItem.items` như `employee` và `contracts` đang làm):<br>`{ title: 'requests', icon: FileCheck2, items: [`<br>`  { title: 'leaveRequests', href: '/requests/leave', icon: CalendarDays },`<br>`  { title: 'wfhRequests', href: '/requests/wfh', icon: House },`<br>`] }` |
| `messages/vi.json`, `messages/ja.json` | Thêm namespace `requests` + key `sidebar.requests`. |
| `lib/constants/notifications.ts` | Thêm 5 loại notification ở §8.4. |

### 10.3 React Query keys

```ts
['requests', 'list', params]
['requests', 'detail', id]
['requests', 'pending-approval', params]
['requests', 'leave-balance', year]
```

Sau mỗi mutation: invalidate `['requests']` (prefix) để list, detail và badge cùng refresh.

---

## 11. Màn hình & Hành vi UI

### 11.1 Hai màn danh sách

Menu **Đơn từ** trên sidebar là menu cha bung ra đúng **2 mục con**, mỗi mục là một màn danh sách độc lập:

| Mục con | Route | Lọc cứng |
|---|---|---|
| **Đơn xin nghỉ phép** | `/requests/leave` | `type = leave_of_absence` |
| **Đăng ký WFH** | `/requests/wfh` | Entity riêng + đơn sau hạn `late_wfh` — xem [`requests-wfh-spec.md`](./requests-wfh-spec.md) |

Hai màn **không dùng chung entity cho luồng chính**: màn nghỉ phép chạy trên `RequestRes` `type = leave_of_absence` (§5.2), màn WFH chạy trên `WfhRegistrationRes` của spec riêng. Đơn xin WFH sau hạn là `RequestRes` `type = late_wfh` nhưng **sống trên màn WFH**, không lẫn vào danh sách nghỉ phép. Vì vậy không màn nào có cột hay bộ lọc "Loại đơn"; màn nghỉ phép có "Loại nghỉ", màn WFH lọc theo tuần và nhân viên.

**Phần dùng chung cho cả 2 màn:**

- **Header:** tiêu đề màn + nút primary (`Tạo đơn` ở màn nghỉ phép; màn WFH không có nút tạo — tick checkbox trên lưới, xem spec WFH).
- **Tabs (màn nghỉ phép):** `Của tôi` (mặc định) · `Chờ tôi duyệt` (kèm badge số) · `Tất cả` (chỉ hiện với CEO/HR). Màn WFH có bộ tab riêng: `Của tôi` · `Toàn công ty`.
- **Toolbar:** ô tìm kiếm (debounce 400ms, tái dùng `use-debounce`), filter Trạng thái + Khoảng thời gian, nút Export.
- **Row action menu:** Xem chi tiết · Sửa · Gửi duyệt · Nhân bản · Huỷ · Xoá — ẩn/hiện theo §7.1 và permission.
- **Empty state:** minh hoạ + CTA tạo đơn đầu tiên của đúng loại đó.

**Khác nhau giữa 2 màn:**

| | Đơn xin nghỉ phép | Đăng ký WFH |
|---|---|---|
| Đặc tả | **File này** | [`requests-wfh-spec.md`](./requests-wfh-spec.md) |
| Tabs | `Của tôi` · `Chờ tôi duyệt` · `Tất cả` | `Của tôi` · `Toàn công ty` (HR/CEO) |
| Thẻ số liệu | Phép năm còn lại · Đã dùng năm nay · Đang chờ duyệt · Đã duyệt năm nay | Đã đăng ký · Tổng lượt WFH · Đơn sau hạn chờ duyệt (theo tuần đang lọc) |
| Bộ lọc riêng | `Loại nghỉ` (5 giá trị ở §5.1) | `Tuần` (bắt buộc) · tìm tên · `Nhân viên` · `Phòng ban` |
| Cột bảng | `Số đơn` · `Loại nghỉ` · `Người làm đơn`¹ · `Thời gian` · `Thời lượng` · `Lý do` · `Người duyệt` · `Trạng thái` · ⋯ | Lưới tuần: `No` · `Fullname` · `Role` · `Mon`–`Sun`. Ô ngày = **checkbox** WFH. Mặc định: tuần hiện tại + nhân viên đang đăng nhập |
| Trạng thái | 6 (§7.2) | Đăng ký tuần: không có. Đơn sau hạn: 6 (§7.2) |

¹ Cột `Người làm đơn` chỉ hiện ở tab `Chờ tôi duyệt` và `Tất cả`.

**Badge trên sidebar:** mục `Đơn xin nghỉ phép` mang badge số đơn đang chờ user duyệt. Mục `Đăng ký WFH` mang badge số đơn sau hạn đang chờ HR duyệt (chỉ hiện với HR/CEO). Menu cha `Đơn từ` không mang badge riêng để tránh trùng lặp con số.

### 11.2 Form tạo/sửa

Form 1 trang, chia section; cột phải là preview thông báo Google Chat, dính (sticky) trên màn hình ≥ lg.

> **Không còn bước chọn loại đơn.** Form nghỉ phép chỉ dùng cho `/requests/leave/create` — tiêu đề card là `Tạo đơn xin nghỉ phép`. Đăng ký WFH tuần làm trên màn danh sách; đơn xin WFH sau hạn có form riêng `/requests/wfh/late/create` (xem [`requests-wfh-spec.md`](./requests-wfh-spec.md) §6.1, §6.4).

1. **Thông tin đơn** — `Số đơn` (read-only, tooltip giải thích format), `Ngày làm đơn` (date picker, mặc định hôm nay), `Người làm đơn` (read-only, user hiện tại), và — **chỉ ở đơn xin nghỉ** — select `Loại nghỉ` (bắt buộc).
2. **Thời gian** — radio `Cả ngày / Nửa ngày / Theo giờ`; field bên dưới đổi theo lựa chọn; hiển thị dòng tóm tắt realtime: *"Tổng: 2 giờ (15h30 – 17h30, ngày 11/09/2026)"*.
3. **Nội dung** — `Lý do` (textarea, đếm ký tự), `Kế hoạch bàn giao` (textarea), `Liên hệ khi nghỉ` (**read-only, prefill từ `EmployeeRes.phone`**, kèm link `Dùng số khác` để mở ra sửa — §6.4).
4. **Người nhận thông báo** — `Người duyệt`: **read-only**, hiện avatar + tên + chức danh của quản lý trực tiếp, kèm dòng phụ *"Quản lý trực tiếp của bạn"*; nút `Đổi người duyệt` chỉ hiện với HR/CEO. `Người theo dõi`: multi-select **nhiều người**, prefill HR, mỗi người là một chip xoá được.
5. **Đính kèm** — dropzone, tái dùng component upload hiện có.
6. **Footer:** `Huỷ` · `Lưu nháp` · `Gửi duyệt` (primary) — căn giữa theo đúng pattern của `contract-form.tsx`.

**Preview thông báo:** cập nhật realtime theo form, hiển thị đúng card sẽ xuất hiện trong Google Chat (kể cả dòng @mention và tên space đích). Không có nút "Sao chép" — người dùng không cần tự gửi tay nữa. Trên đầu preview ghi rõ: *"Gửi vào space **ERP · Đơn từ**"*.

### 11.3 Chi tiết `/requests/leave/[id]` và `/requests/wfh/[id]`

- Cột trái: card thông tin (dùng `detail-row.tsx`), khối **thông báo đã gửi** (card Google Chat kèm link mở thread trong Chat), khối file đính kèm.
- Khi `notify_status = 'failed'`: dải cảnh báo vàng ngay dưới tiêu đề + nút `Gửi lại thông báo` (§8.5).
- Cột phải: trạng thái + action bar + timeline action log (ai, làm gì, lúc nào, note).
- Với approver: action bar dính đáy màn hình trên mobile.
- `Reject` / `Request changes` mở dialog bắt buộc nhập lý do (≥ 5 ký tự).
- Chi tiết đơn xin WFH sau hạn ở `/requests/wfh/late/[id]` — cùng layout, khối thời lượng nghỉ đổi thành chip ngày WFH.

---

## 12. i18n

Thêm namespace `requests` vào `messages/vi.json` và `messages/ja.json` (giữ nguyên thứ tự key giữa 2 file):

Thêm 3 key vào namespace `sidebar` (menu cha + 2 mục con):

```jsonc
"sidebar": {
  "requests": "Đơn từ",
  "leaveRequests": "Đơn xin nghỉ phép",
  "wfhRequests": "Đăng ký WFH"
}
```

Namespace `requests`:

```jsonc
"requests": {
  "title": "Đơn từ",
  "leaveTitle": "Đơn xin nghỉ phép",
  "wfhTitle": "Đăng ký WFH",
  "createLeave": "Tạo đơn",
  "createWfh": "Đăng ký WFH",
  "createLeavePage": "Tạo đơn xin nghỉ phép",
  "createWfhPage": "Đăng ký làm việc tại nhà",
  "emptyLeave": "Bạn chưa có đơn xin nghỉ phép nào",
  "emptyWfh": "Bạn chưa đăng ký WFH lần nào",
  "tabs": { "mine": "Của tôi", "toApprove": "Chờ tôi duyệt", "all": "Tất cả" },
  "type": { "leave_of_absence": "Xin nghỉ" },
  "leaveCategory": {
    "annual_leave": "Nghỉ phép năm",
    "unpaid_leave": "Nghỉ không lương",
    "sick_leave": "Nghỉ ốm",
    "personal_leave": "Nghỉ việc riêng",
    "compensatory_leave": "Nghỉ bù"
  },
  "status": {
    "draft": "Nháp",
    "pending": "Chờ duyệt",
    "changes_requested": "Yêu cầu chỉnh sửa",
    "approved": "Đã duyệt",
    "rejected": "Từ chối",
    "cancelled": "Đã huỷ"
  },
  "durationUnit": { "full_day": "Cả ngày", "half_day": "Nửa ngày", "hours": "Theo giờ" },
  "halfDaySession": { "morning": "Buổi sáng", "afternoon": "Buổi chiều" },
  "fields": {
    "proposalNumber": "Số đơn",
    "proposalDate": "Ngày làm đơn",
    "proposer": "Người làm đơn",
    "subject": "Nội dung",
    "reason": "Mục đích và lý do",
    "replacementPlan": "Kế hoạch bàn giao",
    "contact": "Liên hệ khi nghỉ",
    "approver": "Người duyệt",
    "approverHint": "Quản lý trực tiếp của bạn",
    "changeApprover": "Đổi người duyệt",
    "watchers": "Người theo dõi",
    "watchersHint": "Được nhắc tên trong thông báo, không có quyền duyệt",
    "contactHint": "Lấy từ hồ sơ của bạn",
    "useAnotherPhone": "Dùng số khác",
    "noPhoneInProfile": "Hồ sơ của bạn chưa có số điện thoại — cập nhật tại Hồ sơ để lần sau tự điền.",
    "attachments": "Tài liệu đính kèm"
  },
  "actions": {
    "saveDraft": "Lưu nháp",
    "submit": "Gửi duyệt",
    "approve": "Duyệt",
    "reject": "Từ chối",
    "requestChanges": "Yêu cầu chỉnh sửa",
    "cancel": "Huỷ đơn",
    "duplicate": "Nhân bản"
  },
  "chatPreview": {
    "title": "Xem trước thông báo",
    "sendTo": "Gửi vào space {space}",
    "mention": "{approver} có một đơn cần bạn duyệt",
    "cc": "cc {watchers}"
  },
  "notify": {
    "failed": "Chưa gửi được thông báo vào Google Chat",
    "resend": "Gửi lại thông báo",
    "openThread": "Mở trong Google Chat"
  },
  "errors": {
    "overlapped": "Khoảng thời gian trùng với đơn {proposalNumber}",
    "noteRequired": "Vui lòng nhập lý do",
    "noApprover": "Chưa xác định được quản lý trực tiếp của bạn. Liên hệ HR để cập nhật sơ đồ tổ chức."
  }
}
```

> Nhãn trên **card Google Chat** do BE dựng khi gửi, nên **không** đi qua `next-intl`. FE có bản dựng song song trong `lib/helpers/request-chat-card.ts` chỉ để preview — hai bên phải khớp nhau, sửa một bên thì sửa cả bên kia (§8.2).

---

## 13. Trường hợp biên

| Tình huống | Xử lý |
|---|---|
| Nghỉ vắt qua nhiều tháng | Cho phép; `total_days` tính theo ngày làm việc; card Chat hiển thị `11/09 – 13/09/2026`. |
| Nghỉ vắt qua cuối tuần / ngày lễ | BE loại trừ khi tính `total_days`; FE chỉ hiển thị. |
| Proposer nghỉ việc khi đơn còn `pending` | HR huỷ đơn; record giữ lại phục vụ tra cứu. |
| Approver nghỉ việc / inactive | BE chặn `submit` (`REQUEST_INVALID_APPROVER`); FE hướng dẫn liên hệ HR, HR/CEO chỉ định người duyệt thay. |
| Approve/reject đồng thời ở 2 tab | Lỗi `REQUEST_INVALID_TRANSITION` → toast + refetch. |
| Sang tháng mới mà bản nháp cũ chưa gửi | Khi `submit`, BE cấp lại `proposal_number` theo tháng của `proposal_date` hiện tại; FE hiển thị số mới trong toast thành công. |
| Người làm đơn là CEO | Approver fallback theo §7.3 bước 2–3; không tự duyệt. |
| Gửi Google Chat thất bại | Đơn vẫn chuyển `pending`, thông báo in-app vẫn gửi; hiện dải vàng + nút `Gửi lại thông báo` (§8.5). |
| Người duyệt / người theo dõi chưa có Google account map được | BE gửi card không @mention người đó, kèm dòng cảnh báo trong `notify_error`; thông báo in-app vẫn đến đủ. |
| Space Google Chat bị xoá hoặc bot bị kick | `notify_status = 'failed'` cho mọi đơn mới; HR nhận cảnh báo. Luồng duyệt trong ERP **không** bị chặn. |
| Hồ sơ nhân viên chưa có `phone` | Ô liên hệ mở tự do kèm gợi ý cập nhật hồ sơ (§6.4). |
| Người làm đơn không có quản lý trực tiếp trong org-chart | `REQUEST_NO_APPROVER` → chặn gửi duyệt, hướng dẫn liên hệ HR (§7.3 bước 4). |
| Đổi người duyệt sau khi đã gửi | Không hỗ trợ ở v1 — phải huỷ và tạo đơn mới. |
| Upload file lỗi | Chặn submit, giữ nguyên dữ liệu form. |

---

## 14. Tiêu chí nghiệm thu

**Tự điền (§6.4)**

- [ ] Mở form: người làm đơn, người duyệt, số liên hệ và người theo dõi đều đã điền sẵn, không phải gõ gì.
- [ ] Người làm đơn = user đang đăng nhập, không có cách nào đổi.
- [ ] Người duyệt = quản lý trực tiếp theo org-chart, hiển thị read-only; nhân viên thường **không** thấy nút đổi, HR/CEO thì có.
- [ ] Số liên hệ = `EmployeeRes.phone`; sửa tại form không ghi ngược vào hồ sơ.
- [ ] Hồ sơ không có `phone` → ô mở tự do kèm link tới `/profile`.
- [ ] Thêm được **nhiều** người theo dõi; xoá hết vẫn gửi duyệt được.
- [ ] Org-chart không có quản lý trực tiếp → chặn gửi duyệt kèm hướng dẫn liên hệ HR.

**Thông báo Google Chat (§8)**

- [ ] Gửi duyệt → card xuất hiện trong space, @mention đúng người duyệt, `cc` đúng toàn bộ người theo dõi.
- [ ] Card chứa đủ thông tin của email cũ theo bảng ánh xạ §8.2.
- [ ] Preview trong form khớp với card thật gửi vào Chat.
- [ ] Duyệt / từ chối / yêu cầu sửa / huỷ → reply vào **đúng thread** của đơn đó, và chip trạng thái trên card gốc được cập nhật.
- [ ] Google Chat lỗi → đơn vẫn `pending`, in-app vẫn đến, dải cảnh báo + `Gửi lại thông báo` hoạt động.
- [ ] **Không có email nào được gửi** trong toàn bộ luồng.

**Điều hướng & đặt tên (v3)**

- [ ] Sidebar hiện menu cha **Đơn từ**, bấm vào bung ra đúng **2 mục con**: `Đơn xin nghỉ phép` và `Đăng ký WFH`.
- [ ] Mỗi mục con mở một màn danh sách riêng, chỉ chứa đơn đúng loại của nó.
- [ ] Màn nghỉ phép có cột và bộ lọc `Loại nghỉ`; màn WFH dùng bộ lọc tuần/trạng thái/nhân viên theo spec riêng.
- [ ] Không màn nào còn cột hay bộ lọc `Loại đơn`.
- [ ] Form tạo đơn **không** còn bước chọn loại; loại lấy từ route và tiêu đề nói rõ đang tạo đơn gì.
- [ ] Truy cập `/requests` trần thì redirect về `/requests/leave`.
- [ ] Badge chờ duyệt nằm trên từng mục con, đếm đúng theo loại.
- [ ] Không còn chữ "đề xuất" ở bất kỳ nhãn hiển thị nào; dùng "đơn", "Người làm đơn", "Số đơn".

**Nghiệp vụ chung**

- [ ] `Proposal Number` sinh đúng format `02/0926/NGUYENTHEHOAINAM`, tăng dần theo tháng cho từng người.
- [ ] Tạo được đơn `Xin nghỉ` theo giờ, nửa ngày và nhiều ngày.
- [ ] Lưu nháp → sửa → gửi duyệt hoạt động đúng.
- [ ] Từ chối không nhập lý do bị chặn.
- [ ] Không tự duyệt được đơn của chính mình.
- [ ] Trùng thời gian bị chặn kèm thông báo chỉ rõ đơn bị trùng.
- [ ] Sidebar hiện badge số đơn chờ duyệt.
- [ ] Permission đúng ma trận §4; truy cập thẳng URL không có quyền → `/forbidden`.
- [ ] Toàn bộ chuỗi hiển thị lấy từ `messages/vi.json` và `messages/ja.json`, không hardcode.
- [ ] `npm run lint` và `npm run build` pass.

---

## 15. Câu hỏi cần chốt

**Về Google Chat (cần chốt trước khi BE làm)**

1. **Space đích** — dùng một space chung cho toàn công ty, hay mỗi phòng ban một space? Spec đang giả định **một space chung**; nếu tách theo phòng ban thì `chat_space_name` phải resolve theo `department_id` của người làm đơn.
2. **Map nhân viên → Google user id** — để @mention được thì mỗi nhân viên cần một Google user id. Lấy tự động qua Google Directory API theo `EmployeeRes.email`, hay thêm cột `google_user_id` vào bảng nhân viên?
3. **Quyền của bot** — ai tạo Google Chat app và cấp service account? Bot phải được add vào space trước khi gửi được message đầu tiên.
4. **Ngôn ngữ card** — spec đang để **tiếng Việt** cho card (§8.2). Email cũ viết tiếng Anh theo lệ thư tín; nếu muốn giữ nguyên tiếng Anh thì nói để sửa lại `request-chat-card.ts` và phần BE tương ứng.
5. **Duyệt ngay trong Chat** — v1 card chỉ có nút `Xem chi tiết`. Có muốn đưa nút `Duyệt` / `Từ chối` lên card luôn không? (Cần thêm endpoint nhận interaction từ Google Chat và xác thực chữ ký.)

**Về nghiệp vụ**

6. **Quỹ phép năm** — BE đã có dữ liệu số ngày phép chưa, hay v1 chỉ hiển thị khi API sẵn sàng?
7. **Ngày lễ** — **Đã chốt:** HR CRUD trên màn **Cấu hình chung**. Chi tiết [`general-setting.md`](./general-setting.md) §5. Đơn nghỉ loại khỏi `total_days`; WFH dùng cho R4.
8. **Duyệt nhiều cấp** — đơn nghỉ dài ngày có cần thêm cấp duyệt (CEO) không?
9. **Hạn nộp trước** — có quy định nội bộ (ví dụ nghỉ phép phải xin trước 3 ngày) để đưa thành cảnh báo/chặn không?
10. **Mobile** — `app/[locale]/globals.css` đang đặt `body { min-width: 1280px }` nên ERP hiện là desktop-only; tiêu chí nghiệm thu responsive đã bỏ khỏi §14. Nếu muốn dùng trên điện thoại thì phải gỡ `min-width` trước.
