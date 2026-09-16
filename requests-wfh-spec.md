# Spec — Đăng ký WFH (Đơn từ ▸ WFH)

| | |
|---|---|
| **Thuộc module** | `requests` — mục con **Đơn từ ▸ Đăng ký WFH** |
| **Route** | `/requests/wfh` |
| **Trạng thái tài liệu** | Draft v4 |
| **Ngày tạo** | 2026-09-15 |
| **Cập nhật** | 2026-09-16 — đơn **WFH dài hạn** (`long_term_wfh`) duyệt **2 bước**: quản lý trực tiếp → HR |
| **Spec anh em** | [`requests-module-spec.md`](./requests-module-spec.md) — đơn xin nghỉ phép + phần dùng chung + `late_wfh` + `long_term_wfh`<br>[`general-setting.md`](./general-setting.md) — Cấu hình chung (ngày bắt buộc, hạn khoá, max ngày WFH, ngày lễ) |

**Thay đổi ở v4**

- **Đơn WFH dài hạn duyệt 2 bước tuần tự** — **quản lý trực tiếp** duyệt trước, **HR** duyệt sau cùng. Thêm trạng thái `pending_hr` ("Chờ HR duyệt") giữa `pending` và `approved`. Đơn chỉ có hiệu lực (materialize lên lưới tuần) **sau khi HR duyệt**. Bất kỳ bước nào từ chối / yêu cầu chỉnh sửa đều dừng luồng. §3.7, §3.8, §6.5.
- **HR duyệt theo nhóm** — mọi nhân viên `position_code = 'bo_division'` + `job_role = 'hr'` đều thấy đơn ở bước 2 và ai thao tác trước thì người đó là người duyệt (giống `late_wfh`). BE ghi lại `hr_approver_id`.

**Thay đổi ở v3**

- **Đơn đăng ký WFH dài hạn** (`type = 'long_term_wfh'`) — xin WFH liên tục theo khoảng *từ ngày → đến ngày*. Form: người làm đơn, từ ngày, đến ngày, lý do, tài liệu (upload). Chạy trên `RequestRes` + state machine của spec chính. §3.7, §6.5.


## 2. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| **Bản đăng ký (registration)** | Một bản ghi ứng với **một nhân viên × một tuần**. Mỗi nhân viên có tối đa 1 bản đăng ký cho mỗi tuần. Không có trạng thái duyệt — có bản ghi là đã đăng ký. |
| **Tuần đăng ký** | Tuần kế tiếp tuần hiện tại, tính từ **thứ 2 đến thứ 6**. Thứ 7 và chủ nhật không nằm trong phạm vi. |
| **Hạn sửa** | Mốc `edit_deadline` trên Cấu hình chung (mặc định **23:59 chủ nhật**). Qua mốc này tuần đăng ký bị **khoá**. Chi tiết [`general-setting.md`](./general-setting.md) §4.2. |
| **Khoá tuần (lock)** | Thời điểm hết hạn sửa. Nhân viên không sửa / huỷ bản đăng ký được nữa. **Chỉ HR** còn quyền chỉnh (§3.6). Nhân viên muốn WFH tiếp thì tạo đơn sau hạn (§3.5). |
| **Ngày bắt buộc lên văn phòng** | Ngày trong tuần không được đăng ký WFH. Mặc định **thứ 5**, nhưng **cấu hình được** (§3.2). |
| **Đơn xin WFH sau hạn (late request)** | Đơn `type = 'late_wfh'` tạo **sau khi tuần đã khoá**, người duyệt là HR. Dùng state machine của spec chính (§7). |
| **Đơn WFH dài hạn (long-term request)** | Đơn `type = 'long_term_wfh'` xin WFH **liên tục** theo khoảng từ ngày → đến ngày (không phải tick từng ngày trên lưới tuần). Có lý do + tài liệu đính kèm. Duyệt **2 bước**: quản lý trực tiếp → HR. Dùng state machine của spec chính (§7). |
| **Duyệt 2 bước (two-step approval)** | Riêng đơn WFH dài hạn. **Bước 1** — quản lý trực tiếp xác nhận nhu cầu công việc (`pending` → `pending_hr`). **Bước 2** — HR chốt theo chính sách (`pending_hr` → `approved`). Hai bước **tuần tự**, không song song: HR chỉ thấy đơn sau khi quản lý đã duyệt. |
| **Người duyệt bước 1 / bước 2** | Bước 1 là **một người cụ thể** (`approver_id`, quản lý trực tiếp resolve từ org-chart). Bước 2 là **cả nhóm HR** — không gán đích danh trước, ai thao tác trước thì BE ghi người đó vào `hr_approver_id`. |

---

## 3. Quy tắc nghiệp vụ

### 3.1 Số đơn

Dùng lại nguyên quy tắc `Proposal Number` ở §6.1 của spec chính: `{SEQ}/{MMYY}/{FULLNAME_UPPER}`. Mỗi **bản đăng ký tuần** là một số, không phải mỗi ngày WFH. Đơn sau hạn và đơn WFH dài hạn đều là `Request` nên **có số đơn riêng**, lấy từ cùng bộ đếm.

### 3.2 Cấu hình chính sách — màn **Cấu hình chung**

FE **không được** viết cứng "thứ 5", "2 ngày" hay "23:59 chủ nhật". HR sửa trên **[`general-setting.md`](./general-setting.md)** (`/settings/general`). File này chỉ mô tả **cách WFH đọc** các giá trị.

| Trường | Key | Mặc định | Spec |
|---|---|---|---|
| Số ngày WFH tối đa / tuần | `max_days_per_week` | `2` | general-setting §4.3 |
| Ngày bắt buộc lên văn phòng | `blocked_weekdays` | `[4]` (thứ 5) | general-setting §4.1 |
| Thời gian khoá WFH | `edit_deadline` | CN `23:59` | general-setting §4.2 |
| Ngày nghỉ lễ | bảng `holidays` | — | general-setting §5 |
| Nhân viên không được đăng ký | `blocked_employee_ids` | `[]` | general-setting §5 · §3.2.3 |

`min_days_per_week = 1`, `selectable_weekdays = [1,2,3,4,5]` — không hiện trên form.

Lưới WFH refetch `GET /wfh/policy` — **không cache cứng**.

```ts
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
```

Đổi `blocked_weekdays` **không** tự gỡ WFH đã tick trùng ngày mới bị khoá. BE đánh `invalid` + thông báo in-app.

**Không có hạn mức theo phòng ban.**

#### 3.2.1 Ngày lễ — nguồn dùng chung

Bảng ngày lễ do HR CRUD trên Cấu hình chung — **[`general-setting.md`](./general-setting.md) §6**. WFH đọc cho R4; đơn nghỉ phép loại khỏi `total_days`.

`GET /wfh/weeks?week_start=` resolve `blocked_reason = 'holiday'` + `holiday_name`. FE không tự fetch holidays để suy ô.

#### 3.2.2 Không đăng ký = lên công ty

Nhân viên **cố tình không đăng ký** → mặc định **lên công ty cả tuần**. Hệ thống **không** tạo bản ghi rỗng; hàng trên lưới vẫn hiện, ô ngày làm việc trống.

Quên đăng ký trước hạn, hoặc muốn đổi sau khi tuần đã khoá → **HR sửa dữ liệu trên lưới** (§3.6). Nhân viên không tự sửa sau khoá. Đơn sau hạn (§3.5) vẫn là kênh xin chính thức nếu HR yêu cầu có lý do trên giấy.

#### 3.2.3 Nhân viên bị khoá đăng ký WFH

HR **CRUD danh sách** trên Cấu hình chung — [`general-setting.md`](./general-setting.md) §5. Những người này **không được tự đăng ký** trên màn WFH.

Hàng của họ trên lưới **khoá giống sau hết hạn sửa** (§3.4 / §3.6):

- Mọi checkbox disable (`can_check = false`), kể cả tuần N+1 còn mở.
- `PUT /wfh/registrations` của chính họ → `WFH_EMPLOYEE_BLOCKED`.
- Không tạo đơn sau hạn (`LATE_WFH_EMPLOYEE_BLOCKED`) hay đơn dài hạn (`LONG_TERM_WFH_EMPLOYEE_BLOCKED`).
- Không nhận `wfh.deadline_soon`.
- Hàng **vẫn hiện** trên lưới (kể cả tab Của tôi). Ô WFH đã có trước đó vẫn hiện (checked + disable); không tự xoá lịch.
- Icon khoá cạnh tên + tooltip *"Bạn không được đăng ký WFH. Liên hệ HR."* (chính chủ) / *"Nhân viên này bị khoá đăng ký WFH."* (người khác).
- **HR** tick/bỏ tick hàng này **bất cứ lúc nào** qua override — cùng quyền như tuần đã khoá hạn. Gỡ khỏi danh sách → hàng mở lại theo quy tắc tuần bình thường.

Thêm người vào list khi họ đang có đơn `late_wfh` pending: BE huỷ đơn (H7).

### 3.3 Quy tắc chọn ngày

| # | Quy tắc | Kiểm ở đâu |
|---|---|---|
| **R1** | Chỉ chọn trong **thứ 2 → thứ 6** (`selectable_weekdays`). Thứ 7 / CN **vẫn hiện** trên lưới (cột xám) nhưng checkbox disable. | FE + BE |
| **R2** | Tối đa **`max_days_per_week`** ngày (mặc định 2), tối thiểu `min_days_per_week` (mặc định 1) khi lưu một bản có ≥ 1 ngày. Bỏ hết checkbox = không đăng ký (lên công ty). | FE + BE |
| **R3** | **Không chọn được ngày trong `blocked_weekdays`** — mặc định thứ 5. Checkbox disable, cột cam, tooltip *"Ngày bắt buộc có mặt tại văn phòng"*. | FE + BE |
| **R4** | **Không chọn được ngày nghỉ lễ.** Checkbox disable, tooltip tên ngày lễ. | FE + BE |
| **R5** | Nhân viên **chỉ tick được tuần kế tiếp** khi tuần đó chưa khoá. Bộ lọc cho xem tuần khác (mặc định tuần hiện tại) nhưng checkbox disable. FE gửi `week_start` theo bộ lọc; BE từ chối nếu nhân viên tick tuần không được mở. | BE |
| **R6** | Mỗi nhân viên **tối đa 1 bản đăng ký cho mỗi tuần**. Tick lần đầu là tạo, tick lại là sửa. | BE |
| **R8** | Nhân viên ∈ `blocked_employee_ids` không tự tick / gửi đơn sau hạn. Hàng khoá như hết hạn (§3.2.3). | FE + BE |

**Ví dụ tuần 21/09 – 25/09/2026** trên lưới (23/09 lễ, thứ 5 bắt buộc):

```
 No  Fullname  Role │ Mon 21  Tue 22  Wed 23  Thu 24  Fri 25  Sat 26  Sun 27
  1  …         DEV   │  ☑      ☐      ■ lễ    ■ cam   ☑      ■ xám   ■ xám
```

`☑` = WFH; `☐` = lên công ty (còn tick được); `■` = checkbox disable.

### 3.4 Cửa sổ sửa và khoá tuần

```
  Tuần hiện tại (N)                    │  Tuần đăng ký (N+1)
  T2   T3   T4   T5   T6   T7   CN     │  T2 ─────────────── T6
  ├──────── mở đăng ký & sửa ─────────┤│
                            23:59 CN ──┘  khoá
                            (lock)
```

- Đăng ký cho tuần N+1 **mở suốt tuần N**, tới **23:59 chủ nhật** của tuần N.
- Trong cửa sổ đó nhân viên **sửa thoải mái trên lưới**: tick / bỏ tick checkbox ngày WFH. **Không cần ai duyệt.** Mỗi lần đổi checkbox **lưu ngay** (upsert). **Mọi lần sửa ghi action log** (§4).
- Qua 23:59 chủ nhật: tuần bị khoá. Checkbox của nhân viên disable. **Không** tự sinh trạng thái duyệt.
- BE thực hiện khoá bằng **job chạy lúc 00:00 thứ 2**, đồng thời đánh giá lười (lazy) khi đọc để phòng job lỗi.
- Sau khi khoá:
  - Nhân viên **không** tick được. Checkbox disable.
  - **Cố tình không đăng ký** = lên công ty cả tuần (§3.2.2).
  - **Quên đăng ký** hoặc **muốn đổi** → HR tick/bỏ tick trên lưới (§3.6). Có thể kèm đơn sau hạn (§3.5) nếu cần lý do chính thức.
  - **Chỉ HR** còn được tick. CEO, quản lý, chính chủ — đều không.

### 3.5 Đơn xin WFH sau hạn

Sau khi tuần đã khoá, nhân viên **không** tick checkbox / `PUT /wfh/registrations` được nữa. Muốn WFH tuần đang chạy: nhờ HR tick trên lưới (§3.6), hoặc tạo đơn `type = 'late_wfh'` nếu cần lý do chính thức.

Đơn này **dùng entity `Request` và state machine của spec chính** (`draft` → `pending` → `approved` / `rejected` / …). Người duyệt **không** phải quản lý trực tiếp — luôn là **HR**.

```
  Tuần đã khoá
       │
       ├── đã có bản đăng ký ──► khối read-only + nút [Xin WFH thêm / đổi ngày]
       │
       └── chưa đăng ký ────────► khối khoá + nút [Tạo đơn xin WFH]
                                      │
                                      ▼
                              [late_wfh · pending]
                                      │
                         HR duyệt ────┼──── HR từ chối
                                      ▼              ▼
                         upsert bản đăng ký     đăng ký hiện có không đổi
                         (gộp ngày, ≤ max)
```

| # | Quy tắc | Kiểm ở đâu |
|---|---|---|
| **L1** | Chỉ tạo khi tuần đích **đã khoá** (`is_locked = true`) **và** proposer **không** ∈ `blocked_employee_ids`. Tuần còn mở → `LATE_WFH_WEEK_NOT_LOCKED`. Người bị khoá đăng ký → `LATE_WFH_EMPLOYEE_BLOCKED`. | BE |
| **L2** | Chỉ xin các ngày **còn lại** của tuần đang chạy. Ngày đã qua: checkbox disable, tooltip *"Ngày đã qua"*. | FE + BE |
| **L3** | Vẫn áp R1–R4, R7. **Tổng ngày** (đã đăng ký trên bản tuần + ngày đang xin, union) ≤ `max_days_per_week`. | FE + BE |
| **L4** | **Lý do bắt buộc**, 5–500 ký tự — đây là đơn ngoại lệ, không phải đăng ký thường. | FE + BE |
| **L5** | Người duyệt = HR. BE gán `approver_id` là nhân viên HR mặc định (cùng quy tắc nhóm HR ở spec chính §7.3). Mọi HR và CEO duyệt được; không ai duyệt đơn của chính mình. Form hiển thị read-only *"Người duyệt: HR"*. | BE |
| **L6** | Một nhân viên **tối đa 1 đơn `pending`/`changes_requested`** cho cùng tuần. Tạo thêm → `LATE_WFH_PENDING`, FE điều hướng sang đơn đang chờ. | BE |
| **L7** | Khi HR **duyệt**: BE upsert `WfhRegistration` của tuần đó — union ngày được duyệt vào bản hiện có (tạo mới nếu chưa có), không vượt `max_days_per_week`. Action log ghi `late_approved`. | BE |
| **L8** | Khi HR **từ chối**: bản đăng ký hiện có **không đổi**. Nhân viên nhận thông báo in-app + reply Google Chat. Muốn xin lại → tạo đơn mới (nút Nhân bản). | BE |
| **L9** | HR **yêu cầu chỉnh sửa**: nhân viên sửa ngày / lý do rồi gửi lại, vẫn trong cửa sổ tuần chưa kết thúc. | FE + BE |
| **L10** | Đơn sau hạn **đẩy Google Chat** như đơn nghỉ phép (một đơn = một thread). Mỗi lần nhân viên lưu đăng ký tuần **không** đẩy Chat; bản tin workspace là card tổng hợp sáng T2 (§7.2). | BE |

**Người theo dõi:** mặc định nhóm HR như spec chính. Vì người duyệt đã là HR, FE ẩn HR khỏi danh sách watcher mặc định để tránh @mention trùng; người làm đơn vẫn thêm người khác được.

**HR tự xin sau hạn:** `approver_id` fallback sang CEO (không tự duyệt). HR cũng có thể bỏ qua đơn và chỉnh trực tiếp trên lưới (§3.6).

### 3.6 HR chỉnh sửa sau khi khoá

Khi `is_locked = true` **hoặc** hàng thuộc nhân viên bị khoá đăng ký (§3.2.3), **chỉ HR** được đổi ngày WFH trên hàng đó.

```
  Tuần đã khoá
       │
       ├── nhân viên ──► không sửa được ──► đơn sau hạn (§3.5)
       │
       └── HR ─────────► tick checkbox trên lưới tuần (§6.1)
                            thêm / bớt WFH, vẫn R1–R4, ≤ max
```

| # | Quy tắc | Kiểm ở đâu |
|---|---|---|
| **H1** | Caller phải là HR (`bo_division` + `job_role = 'hr'`). Không phải HR → `WFH_LOCKED_HR_ONLY`, kể cả CEO và chính chủ. | BE + FE ẩn tương tác |
| **H2** | Tuần đích **đã khoá hạn** *hoặc* `employee_id ∈ blocked_employee_ids`. Gọi override khi tuần còn mở **và** người đó không bị khoá đăng ký → `WFH_WEEK_NOT_LOCKED`. | BE |
| **H3** | Vẫn áp R1–R4: không gắn WFH vào ngày lễ, ngày bắt buộc lên văn phòng, T7/CN. HR **được** sửa cả ngày đã qua trong tuần đã khoá — đây là đường sửa số liệu. | FE + BE |
| **H4** | Số ngày WFH của một người sau khi sửa ∈ `0 … max_days_per_week`. `0` = huỷ đăng ký tuần đó (xoá mềm / không còn hàng WFH). Không bắt `min_days_per_week`. | FE + BE |
| **H5** | Chưa có bản đăng ký mà HR gắn ≥ 1 ngày → BE tạo `WfhRegistration` (sinh số đơn). Đã có bản → upsert `days`. | BE |
| **H6** | Mỗi lần lưu ghi action log `hr_updated` (`days_before` / `days_after`, actor = HR). Nhân viên nhận thông báo in-app `wfh.hr_updated`. Nếu card tổng hợp tuần đã gửi → BE `patch` card (§7.2). Không gửi Chat từng lần click. | BE |
| **H7** | Nếu nhân viên đang có đơn `late_wfh` `pending` / `changes_requested` cho cùng tuần: BE **huỷ** đơn đó (`cancelled`) kèm note *"HR đã chỉnh trực tiếp trên lịch WFH"*, reply thread Chat. Tránh lịch và đơn lệch nhau. | BE |

**Cách sửa trên UI:** HR tick / bỏ tick checkbox ngày làm việc trên lưới. Mỗi lần đổi **lưu ngay** qua `PUT /wfh/registrations/override`. Ô lễ / bắt buộc / cuối tuần: checkbox disable.

Không có form chip hay nút "Chỉnh sửa" bọc ngoài — **lưới là form**.

### 3.7 Đơn đăng ký WFH dài hạn

Khi nhân viên cần WFH **liên tục nhiều ngày / nhiều tuần** (không phải 1–2 ngày rời rạc trên lưới tuần), họ tạo đơn `type = 'long_term_wfh'`. Đây **không** phải tick checkbox tuần — là một `Request` có khoảng thời gian, lý do, tài liệu, và **phải được duyệt qua 2 bước**.

Hai bước vì hai câu hỏi khác nhau: **quản lý trực tiếp** trả lời *"công việc của bạn có chạy được khi WFH dài như vậy không"*, **HR** trả lời *"trường hợp này có đúng chính sách công ty không"*. Không ai trả lời thay ai được, nên đơn phải qua cả hai.

```
  Nhân viên mở form
       │
       ├── Người làm đơn   = user đăng nhập (read-only)
       ├── Từ ngày / Đến ngày
       ├── Lý do
       ├── Tài liệu        = upload đính kèm
       └── Người duyệt     = quản lý trực tiếp → HR (read-only, 2 bước)
                                      │
                                      ▼
                        [pending] · Chờ quản lý duyệt          ◄── bước 1
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │ QL từ chối                  │ QL duyệt                    │ QL yêu cầu sửa
        ▼                             ▼                             ▼
   [rejected]              [pending_hr] · Chờ HR duyệt      [changes_requested]
   (kết thúc)                          │                             │
                                       │                    sửa & gửi lại
        ┌──────────────────────────────┼──────────────┐              │
        │ HR từ chối                   │ HR duyệt     │ HR yêu cầu sửa│
        ▼                              ▼              └──────────────┤
   [rejected]                     [approved]                         │
   (kết thúc)                          │                             ▼
                          materialize lên lưới tuần        quay lại bước 1
                          (mọi ngày làm việc trong khoảng,   (QL duyệt lại)
                           trừ lễ / T7 / CN)
```

**Đơn chỉ có hiệu lực sau khi HR duyệt.** Ở `pending_hr` lưới tuần **chưa** đổi — quản lý duyệt là gật đầu về công việc, chưa phải quyết định cuối cùng.

| # | Quy tắc | Kiểm ở đâu |
|---|---|---|
| **T1** | Proposer **không** ∈ `blocked_employee_ids`. Người bị khoá → `LONG_TERM_WFH_EMPLOYEE_BLOCKED`. Ẩn CTA trên UI. | FE + BE |
| **T2** | `end_date >= start_date`. Cả hai là ISO date, đơn vị luôn `full_day`. Không có nửa ngày / theo giờ. | FE + BE |
| **T3** | Khoảng phải phủ **≥ 2 tuần ISO** — `iso_week(end_date)` khác `iso_week(start_date)` (kể cả vắt năm). Xin ngắn hơn → dùng lưới tuần hoặc đơn sau hạn. `LONG_TERM_WFH_RANGE_TOO_SHORT`. | FE + BE |
| **T4** | `start_date` **không** ở quá khứ. Cảnh báo mềm nếu = hôm nay (bắt đầu giữa tuần). | FE + BE |
| **T5** | **Lý do bắt buộc**, 5–500 ký tự. | FE + BE |
| **T6** | **Tài liệu bắt buộc ≥ 1 file.** Tái dùng `ListFileRecords` / dropzone của spec chính. Tối đa 5 file, mỗi file ≤ 10MB. Thiếu file → `LONG_TERM_WFH_FILE_REQUIRED`. | FE + BE |
| **T7** | Đơn qua **2 bước duyệt tuần tự** — chi tiết §3.8. **Bước 1** `approver_id` = **quản lý cấp trên trực tiếp**, đúng quy tắc spec chính §7.3 (org-chart → fallback CEO → nhảy cấp nếu trùng proposer). **Bước 2** = **nhóm HR**, không gán đích danh. Form hiển thị read-only cả hai bước. Chỉ HR/CEO thấy nút `Đổi người duyệt` (chỉ đổi được bước 1). | BE |
| **T8** | Một nhân viên **tối đa 1 đơn `pending` / `pending_hr` / `changes_requested`**. Tạo thêm → `LONG_TERM_WFH_PENDING`, FE điều hướng sang đơn đang chờ. | BE |
| **T9** | Khoảng `[start_date, end_date]` **không trùng** đơn `pending` / `pending_hr` / `approved` khác của cùng người (`long_term_wfh` hoặc `leave_of_absence`). → `REQUEST_OVERLAPPED` kèm số đơn bị trùng. | BE |
| **T10** | Khi **HR duyệt** (bước 2, `pending_hr` → `approved`): BE materialize lên lưới — với **mỗi tuần ISO** giao với khoảng, upsert `WfhRegistration`: mọi ngày làm việc (T2–T6) ∈ khoảng, **trừ ngày lễ**. **Bỏ qua** `max_days_per_week` và `blocked_weekdays` — đơn dài hạn là ngoại lệ đã được cả quản lý lẫn HR duyệt. Action log ghi `long_term_approved`. Ô lưới: `mark = 'wfh'`, `source = 'long_term'`, `can_check = false` (trừ HR override). **Quản lý duyệt bước 1 không materialize gì cả.** | BE |
| **T11** | **Từ chối ở bất kỳ bước nào**: đơn → `rejected` (kết thúc), lưới **không đổi**. Nhân viên nhận in-app + reply Google Chat kèm tên người từ chối và bước bị dừng. Xin lại → Nhân bản. | BE |
| **T12** | **Yêu cầu chỉnh sửa ở bất kỳ bước nào**: đơn → `changes_requested`. Nhân viên sửa ngày / lý do / tài liệu rồi gửi lại; đơn quay về **`pending` (bước 1)** — xem T17. | FE + BE |
| **T13** | Đơn dài hạn **đẩy Google Chat** như đơn nghỉ phép (một đơn = một thread). Bước 1 @mention quản lý; khi quản lý duyệt, BE reply cùng thread @mention **nhóm HR** cho bước 2 (§7.3). Card: khoảng ngày, số ngày làm việc, lý do, số file đính kèm, **chip trạng thái theo bước**. | BE |
| **T14** | Huỷ đơn `approved` khi `start_date > today` (proposer / HR / CEO): BE gỡ các ngày `source = 'long_term'` của đơn này khỏi lưới các tuần chưa diễn ra. Tuần đã qua giữ nguyên. | BE |
| **T15** | Đơn `pending` / `pending_hr` phủ tuần đã khoá: **không** chặn gửi. Khi HR duyệt, materialize cả ngày đã qua trong tuần đang chạy (đường ghi nhận, giống H3). | BE |
| **T16** | Khi **HR duyệt** mà nhân viên đang có `late_wfh` `pending` / `changes_requested` giao tuần với khoảng: BE **huỷ** đơn sau hạn đó (H7) — lịch dài hạn là nguồn sự thật. Ở `pending_hr` thì **chưa** đụng tới `late_wfh`, vì đơn dài hạn còn có thể bị HR từ chối. | BE |
| **T17** | Sau `changes_requested`, nhân viên gửi lại → đơn về **`pending`**, BE **xoá dấu vết bước 1** (`manager_decided_at` / `manager_decided_by` / `manager_decision_note` = `null`) và quản lý phải duyệt lại. Kể cả khi chính HR là người yêu cầu sửa: nội dung (khoảng ngày, lý do, tài liệu) đã đổi thì cái gật đầu cũ của quản lý không còn giá trị. | BE |
| **T18** | **Không ai duyệt hai bước của cùng một đơn.** Nếu người duyệt bước 1 cũng thuộc nhóm HR, bước 2 phải do HR khác hoặc CEO thao tác. Proposer thuộc nhóm HR thì cũng không tự duyệt bước 2 của mình. Không còn ai hợp lệ → fallback **CEO**. Vi phạm → `REQUEST_NOT_APPROVER`. | BE |

**Người theo dõi:** mặc định nhóm HR như spec chính. Người làm đơn thêm/bớt được. HR là người theo dõi **không** đồng nghĩa với quyền duyệt bước 2 — quyền đó đến từ `job_role = 'hr'`, không từ danh sách theo dõi.

**Quản lý tự xin:** `approver_id` bước 1 nhảy lên một cấp (không tự duyệt) — cùng §7.3 spec chính. Bước 2 vẫn là HR như mọi đơn khác.

**HR / CEO:** xem mọi đơn. **CEO** duyệt thay được ở cả hai bước. **HR** là người duyệt chính thức của bước 2; HR duyệt thay quản lý ở bước 1 thì đơn vẫn phải qua bước 2 do **HR khác hoặc CEO** thực hiện (T18) — một người không gánh cả hai vai.

**Tách với đăng ký tuần và đơn sau hạn**

| | Đăng ký tuần | Đơn sau hạn | **Đơn dài hạn** |
|---|---|---|---|
| Entity | `WfhRegistration` | `Request` `late_wfh` | `Request` `long_term_wfh` |
| Cách chọn ngày | Checkbox rời trên lưới | Checkbox ngày còn lại của tuần khoá | `Từ ngày` → `Đến ngày` |
| Duyệt | Không | HR — **1 bước** | **2 bước: quản lý trực tiếp → HR** |
| Trạng thái trung gian | — | — | `pending_hr` |
| Lý do / tài liệu | Không | Lý do bắt buộc, không bắt file | Lý do + **≥ 1 file** |
| Hạn mức tuần / ngày bắt buộc lên VP | Áp R2, R3 | Áp R2, R3 | **Không** — ngoại lệ đã duyệt |
| Sống ở đâu | Lưới `/requests/wfh` | `/requests/wfh/late/*` | `/requests/wfh/long-term/*` |

### 3.8 Duyệt 2 bước — chi tiết

Chỉ `long_term_wfh` dùng luồng này. `leave_of_absence` và `late_wfh` giữ nguyên 1 bước.

**Trạng thái `pending` mang nghĩa khác nhau theo loại đơn:** với `leave_of_absence` / `late_wfh` nó là *"chờ duyệt"*; với `long_term_wfh` nó là *"chờ **quản lý** duyệt"* (bước 1). Nhãn hiển thị vì thế phải đọc theo `type`: FE tra key `statusLongTermWfh.{status}` trước, không có thì rơi về `status.{status}` dùng chung (spec chính §7.2, §12).

| Bước | Từ | Hành động | Đến | Ai được làm |
|---|---|---|---|---|
| — | `draft` | `submit` | `pending` | Proposer |
| **1** | `pending` | `approve` | **`pending_hr`** | `approver_id` (quản lý trực tiếp), CEO |
| **1** | `pending` | `reject` (bắt buộc note) | `rejected` | `approver_id`, CEO |
| **1** | `pending` | `request_changes` (bắt buộc note) | `changes_requested` | `approver_id`, CEO |
| **2** | `pending_hr` | `approve` | **`approved`** + materialize (T10) | Bất kỳ ai thuộc nhóm HR, CEO — trừ người đã duyệt bước 1 và trừ proposer (T18) |
| **2** | `pending_hr` | `reject` (bắt buộc note) | `rejected` | Nhóm HR, CEO |
| **2** | `pending_hr` | `request_changes` (bắt buộc note) | `changes_requested` | Nhóm HR, CEO |
| — | `changes_requested` | `submit` | `pending` (**về bước 1**, T17) | Proposer |
| — | `pending` / `pending_hr` / `changes_requested` | `cancel` | `cancelled` | Proposer |
| — | `approved` | `cancel` | `cancelled` + gỡ lưới (T14) | Proposer (chỉ khi `start_date > today`), HR, CEO |

**Cùng một endpoint cho cả hai bước.** FE gọi `POST /requests/:id/approve` như mọi đơn khác; BE nhìn `status` hiện tại để biết đang xử lý bước nào và chuyển sang trạng thái kế tiếp. Không có endpoint `approve-hr` riêng — thêm endpoint theo bước sẽ nhân đôi mọi thứ ở FE mà không thêm thông tin gì.

**Ai thấy đơn ở tab "Chờ tôi duyệt"** (`GET /requests?type=long_term_wfh&scope=to_approve`):

| Caller | Thấy đơn có `status` |
|---|---|
| Quản lý trực tiếp (là `approver_id` của đơn) | `pending` |
| Nhân viên nhóm HR | `pending_hr` |
| CEO | `pending` + `pending_hr` |
| HR mà cũng là `approver_id` của đơn đó | `pending` (bước 1 của mình) — đơn đó **không** quay lại với họ ở bước 2 (T18) |

`RequestsMeta.pending_count` đếm đúng tập trên theo vai trò của caller, không tách hai con số — với người dùng thì đó chỉ là *"số đơn đang chờ tôi"*.

**Dấu vết hai bước** ghi riêng trên `RequestRes`: bước 1 vào `manager_decided_at` / `manager_decided_by` / `manager_decision_note`, bước cuối (HR duyệt, hoặc ai đó từ chối) vào `decided_at` / `decided_by` / `decision_note` sẵn có. Nhờ vậy màn chi tiết dựng được timeline *"QL duyệt lúc … → HR duyệt lúc …"* mà không cần đọc ngược action log.

---

## 4. Mô hình dữ liệu

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

  submitted_at: string;
  /** Thời điểm tuần bị khoá. null = chưa khoá. */
  locked_at?: string | null;
  /** Hạn sửa của chính bản này — BE tính sẵn để FE khỏi tự suy ra. */
  edit_deadline_at: string;
  /** true khi now < edit_deadline_at, caller là chính chủ, **và** không ∈ blocked_employee_ids. */
  can_edit: boolean;
  /** true khi tuần đã khoá **và** caller là HR. FE bật click-to-toggle trên lưới. */
  can_hr_edit: boolean;

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
  action: 'created' | 'updated' | 'withdrawn' | 'locked' | 'late_approved' | 'hr_updated' | 'long_term_approved';
  /** Với 'updated' / 'late_approved' / 'hr_updated' / 'long_term_approved': ghi lại thay đổi để đối chiếu. */
  days_before?: WfhDay[] | null;
  days_after?: WfhDay[] | null;
  note?: string | null;
  actor?: WfhUserRef | null;
  created_at: string;
}

export interface WfhWeekDay {
  date: string;
  weekday: number;              // 1 = T2 … 7 = CN
  selectable: boolean;
  /** Vì sao không chọn được. null khi selectable = true. */
  blocked_reason?: 'holiday' | 'mandatory_office' | 'weekend' | 'past' | null;
  holiday_name?: string | null;
}

export interface WfhWeekInfo {
  week_start: string;
  week_end: string;             // thứ 6 — phạm vi đăng ký
  iso_year: number;
  iso_week: number;
  edit_deadline_at: string;
  is_locked: boolean;
  /** true khi is_locked và caller là HR. FE bật click-to-toggle trên lưới. */
  can_hr_edit: boolean;
  /**
   * 7 ngày T2 → CN. Form đăng ký chỉ render weekday 1–5;
   * lưới list render cả 7 (§6.1).
   */
  days: WfhWeekDay[];
}

/** Một hàng trên màn list — một nhân viên × một tuần. */
export interface WfhRosterRow {
  employee: WfhUserRef;
  role: string;
  registration_id?: number | null;
  /**
   * true khi tuần đã khoá hạn **hoặc** employee ∈ blocked_employee_ids.
   * FE khoá cả hàng giống hết hạn — không suy từ policy ở client.
   */
  is_row_locked: boolean;
  /** null khi is_row_locked = false. */
  row_lock_reason?: 'week_deadline' | 'employee_blocked' | null;
  days: Array<{
    date: string;
    weekday: number;
    /**
     * `wfh` — đã đăng ký (tuần / sau hạn đã duyệt / dài hạn đã duyệt).
     * `wfh_pending` — đang có đơn sau hạn *hoặc* đơn dài hạn chờ duyệt phủ ngày này.
     * `empty` — lên văn phòng / không WFH.
     */
    mark: 'wfh' | 'wfh_pending' | 'empty';
    /** Nguồn ô WFH — để tooltip và khoá checkbox. */
    source?: 'weekly' | 'late' | 'long_term' | 'hr_override' | null;
    /** FE bind checkbox. false nếu hàng khoá hạn / bị block / phủ bởi đơn dài hạn đã duyệt / không đúng quyền. */
    can_check: boolean;
    late_request_id?: number | null;
    long_term_request_id?: number | null;
  }>;
}

export interface WfhRosterRes {
  week: WfhWeekInfo;
  rows: WfhRosterRow[];
}
```

Đơn sau hạn và đơn dài hạn **không** thêm entity mới. Mở rộng `RequestRes` (spec chính):

```ts
// type = 'late_wfh'
wfh_week_start?: string | null;   // thứ 2 của tuần đang xin
wfh_dates?: string[] | null;      // ISO date, 1..max_days_per_week

// type = 'long_term_wfh' — dùng start_date / end_date sẵn có trên RequestRes
// wfh_week_start / wfh_dates = null
```

**`late_wfh`:** `start_date` / `end_date` = min/max của `wfh_dates`. `duration_unit` luôn `full_day`. `leave_category` = `null`.

**`long_term_wfh`:** `start_date` / `end_date` do người dùng chọn (T2). `duration_unit` luôn `full_day`. `leave_category` = `null`. `total_days` = số ngày làm việc trong khoảng (BE tính, loại T7/CN + lễ). File đính kèm qua `file_ids` / `ListFileRecords` — bắt buộc ≥ 1.

Luồng 2 bước (§3.8) cần thêm trạng thái `pending_hr` và 4 trường dấu vết bước 1 trên `RequestRes` — khai báo ở spec chính §5.1, §5.2:

```ts
// lib/constants/requests.ts — thêm vào REQUEST_STATUSES, giữa 'pending' và 'changes_requested'
'pending_hr',   // Chờ HR duyệt — CHỈ long_term_wfh đi qua trạng thái này

// lib/types/request.ts — thêm vào RequestRes
/** Bước 2. null cho tới khi một HR thực sự thao tác — bước 2 không gán đích danh trước (§3.8). */
hr_approver_id?: number | null;
hr_approver?: RequestUserRef | null;
/** Dấu vết bước 1 (quản lý trực tiếp). Bị xoá về null khi đơn quay lại bước 1 (T17). */
manager_decided_at?: string | null;
manager_decided_by?: number | null;
manager_decision_note?: string | null;
```

`decided_at` / `decided_by` / `decision_note` giữ nguyên nghĩa **quyết định kết thúc đơn**: HR duyệt bước 2, hoặc bất kỳ ai từ chối / yêu cầu chỉnh sửa.

### 4.1 Payload

```ts
export interface UpsertWfhRegistrationPayload {
  /**
   * Thứ 2 của tuần đang xem trên lưới.
   * Nhân viên: chỉ chấp nhận tuần kế tiếp chưa khoá.
   * HR override: tuần đã khoá (§3.6) — dùng endpoint override.
   */
  week_start: string;
  dates: string[];
  note?: string;
}

export interface HrOverrideWfhPayload {
  employee_id: number;
  /** Thứ 2 của tuần đã khoá đang xem trên lưới. */
  week_start: string;
  /** Toàn bộ ngày WFH sau khi sửa. `[]` = huỷ đăng ký tuần đó. */
  dates: string[];
  note?: string;
}

export interface CreateLateWfhPayload {
  /** Ngày WFH xin thêm / đổi. BE tự gắn với tuần đang khoá. */
  dates: string[];
  reason: string;               // bắt buộc, 5–500 ký tự
  watcher_ids?: number[];
  submit?: boolean;             // true → gửi duyệt luôn
}

export interface CreateLongTermWfhPayload {
  start_date: string;           // ISO date — Từ ngày
  end_date: string;             // ISO date — Đến ngày; phải ≥ start_date và phủ ≥ 2 tuần ISO
  reason: string;               // bắt buộc, 5–500 ký tự
  file_ids: number[];           // bắt buộc ≥ 1, ≤ 5
  watcher_ids?: number[];
  /**
   * Người duyệt **bước 1** (quản lý trực tiếp). Chỉ HR/CEO gửi khi đổi người duyệt.
   * Form thường không gửi — BE resolve quản lý trực tiếp (§3.7 T7).
   * Bước 2 là nhóm HR, không nhận từ payload (§3.8).
   */
  approver_id?: number;
  submit?: boolean;
}

export interface QueryParamsWfh extends QueryParams {
  /** Tab trên UI. */
  scope?: 'mine' | 'all';
  /** Lọc theo tuần — truyền thứ 2. **Mặc định: tuần chứa hôm nay.** */
  week_start?: string;
  /** Lọc theo nhân viên. **Mặc định: user đang đăng nhập.** HR/CEO xoá filter để xem tất cả. */
  employee_id?: number;
  department_id?: number;
  search?: string;              // theo tên nhân viên
  sort_by?: 'employee_name' | 'role';
  sort_order?: 'asc' | 'desc';
}
```

Đơn sau hạn tạo/sửa/duyệt qua API `Request` của spec chính (`POST /requests` với `type: 'late_wfh'` + `CreateLateWfhPayload`). List đơn chờ HR duyệt: `GET /requests?type=late_wfh&scope=to_approve`.

Đơn dài hạn cùng kênh: `POST /requests` với `type: 'long_term_wfh'` + `CreateLongTermWfhPayload`. List chờ tôi duyệt: `GET /requests?type=long_term_wfh&scope=to_approve` — BE tự lọc theo bước tương ứng với vai trò của caller (§3.8). Duyệt cả hai bước qua cùng `POST /requests/:id/approve`. List của tôi / toàn công ty: `scope=mine` / `scope=all`. Lọc riêng từng bước: `status=pending` (chờ quản lý) hoặc `status=pending_hr` (chờ HR).

---

## 5. Hợp đồng API

| Method | Endpoint | Payload / Params | Response |
|---|---|---|---|
| GET | `/wfh/policy` | — | `WfhPolicy` (§3.2) |
| PUT | `/wfh/policy` | `UpdateWfhPolicyPayload` | `WfhPolicy` — **chỉ HR**; không gồm block list |
| GET | `/settings/wfh-blocked-employees` | `search?` | `WfhBlockedEmployee[]` — [`general-setting.md`](./general-setting.md) §5 |
| POST | `/settings/wfh-blocked-employees` | `CreateWfhBlockedEmployeePayload` | `WfhBlockedEmployee` |
| PATCH | `/settings/wfh-blocked-employees/:id` | `UpdateWfhBlockedEmployeePayload` | `WfhBlockedEmployee` |
| DELETE | `/settings/wfh-blocked-employees/:id` | — | `void` |
| GET | `/settings/holidays` | `year?` | `Holiday[]` — xem [`general-setting.md`](./general-setting.md) §6 |
| POST | `/settings/holidays` | `UpsertHolidayPayload` | `Holiday` — **chỉ HR** |
| PUT | `/settings/holidays/:id` | `UpsertHolidayPayload` | `Holiday` — **chỉ HR** |
| DELETE | `/settings/holidays/:id` | — | `void` — **chỉ HR** |
| GET | `/wfh/weeks` | `week_start` (thứ 2, mặc định tuần chứa hôm nay) | `WfhWeekInfo` — header lưới + `can_hr_edit` |
| GET | `/wfh/weeks/next` | — | `WfhWeekInfo` — tuần kế tiếp (hint đăng ký) |
| GET | `/wfh/roster` | `QueryParamsWfh` | `WfhRosterRes` + `WfhMeta` — **màn list** (§6.1) |
| GET | `/wfh/registrations` | `QueryParamsWfh` | `WfhRegistrationRes[]` + `WfhMeta` — chi tiết / tra cứu, không dùng cho list |
| GET | `/wfh/registrations/:id` | — | `WfhRegistrationRes` |
| GET | `/wfh/registrations/my-next-week` | — | `WfhRegistrationRes \| null` — bản của tôi cho tuần sau |
| PUT | `/wfh/registrations` | `UpsertWfhRegistrationPayload` | `WfhRegistrationRes \| null` — tick checkbox trên lưới. Chính chủ + tuần chưa khoá (tuần N+1). `dates = []` → huỷ đăng ký |
| PUT | `/wfh/registrations/override` | `HrOverrideWfhPayload` | `WfhRegistrationRes \| null` — **chỉ HR**; tuần đã khoá hạn **hoặc** nhân viên ∈ `blocked_employee_ids` (§3.2.3, §3.6) |
| DELETE | `/wfh/registrations/:id` | — | `void` (huỷ đăng ký: chính chủ trước hạn, **hoặc HR sau khoá**) |
| GET | `/wfh/registrations/:id/action-logs` | — | `WfhActionLog[]` |
| GET | `/wfh/export` | `QueryParamsWfh & QueryParamsExport` | file blob — **đúng layout lưới tuần** (§6.1), không phải list đăng ký phẳng |
| POST | `/wfh/digest/resend` | `{ week_start: string }` | `{ ok: boolean }` — HR gửi lại card tổng hợp tuần (§7.2) |
| POST | `/requests` | `type: 'late_wfh'` + `CreateLateWfhPayload` | `RequestRes` — đơn sau hạn (§3.5) |
| GET | `/requests` | `type=late_wfh&scope=to_approve` | Đơn sau hạn chờ HR duyệt |
| POST | `/requests` | `type: 'long_term_wfh'` + `CreateLongTermWfhPayload` | `RequestRes` — đơn WFH dài hạn (§3.7) |
| GET | `/requests` | `type=long_term_wfh&scope=mine\|to_approve\|all`, `status?` | Danh sách đơn dài hạn. `scope=to_approve` trả `pending` cho quản lý, `pending_hr` cho HR, cả hai cho CEO (§3.8) |
| POST | `/requests/:id/approve` | `RequestDecisionPayload` | `RequestRes` — dùng cho **cả hai bước**; BE nhìn `status` để biết bước nào (§3.8) |

```ts
export interface WfhMeta extends PaginationMeta {
  /** Số nhân viên đã đăng ký ≥ 1 ngày WFH trong tuần đang lọc. */
  registered_count?: number;
  /** Tổng lượt WFH trong tuần đang lọc. */
  total_days?: number;
  /** Số đơn sau hạn đang chờ duyệt — chỉ trả cho HR/CEO. */
  late_pending_count?: number;
  /** Số đơn WFH dài hạn đang chờ **caller** duyệt — bước 1 nếu caller là quản lý, bước 2 nếu caller là HR, cả hai nếu là CEO (§3.8). */
  long_term_pending_count?: number;
  /** Chỉ trả cho HR/CEO: số đơn dài hạn `pending_hr` toàn công ty — dùng cho thẻ số liệu tab Toàn công ty. */
  long_term_hr_pending_count?: number;
  /** Chỉ trả cho HR/CEO: số đơn dài hạn `pending` (còn nằm ở quản lý) toàn công ty — để HR biết cái gì đang tới. */
  long_term_manager_pending_count?: number;
}
```

> **Roster là nguồn của màn list.** `GET /wfh/roster` trả **một hàng cho mỗi nhân viên còn hiệu lực** trong phạm vi tab (tab "Của tôi" = đúng 1 hàng; tab "Toàn công ty" = toàn bộ nhân viên active), **kể cả người chưa đăng ký**. Ô trống = lên văn phòng. Không ẩn hàng vì chưa có `WfhRegistration`.
>
> **Dùng `PUT /wfh/registrations` chứ không phải `POST`** vì đây là upsert theo (nhân viên × tuần): tick lần đầu là tạo, tick lại là sửa, bỏ hết tick là huỷ. R6 được đảm bảo ở mức API.

**Mã lỗi:**

| Code | Ý nghĩa | Xử lý UI |
|---|---|---|
| `WFH_WEEK_LOCKED` | Đã qua 23:59 chủ nhật, caller **không** phải HR gọi upsert/huỷ của chính chủ | Toast + chuyển form sang read-only + hiện CTA tạo đơn sau hạn |
| `WFH_LOCKED_HR_ONLY` | Tuần đã khoá, caller không phải HR gọi `/override` hoặc click lưới | Không hiện control; nếu vẫn lọt thì toast *"Chỉ HR được chỉnh WFH sau khi tuần đã khoá"* |
| `WFH_WEEK_NOT_LOCKED` | HR gọi `/override` khi tuần còn mở **và** nhân viên không bị khoá đăng ký | Toast |
| `WFH_EMPLOYEE_BLOCKED` | Nhân viên ∈ `blocked_employee_ids` tự tick / huỷ | Toast *"Bạn không được đăng ký WFH. Liên hệ HR."*; hàng đã disable |
| `LATE_WFH_EMPLOYEE_BLOCKED` | Người bị khoá tạo đơn sau hạn | Ẩn CTA; nếu lọt thì toast |
| `WFH_TOO_MANY_DAYS` | Vượt `max_days_per_week` | Chặn ngay ở FE; nếu vẫn lọt thì toast |
| `WFH_DAY_NOT_SELECTABLE` | Chọn ngày lễ, ngày bắt buộc lên văn phòng, hoặc ngày đã qua | Toast nêu rõ ngày nào và vì sao |
| `WFH_ALREADY_REGISTERED` | Đã có bản cho tuần đó | Điều hướng sang bản đang có |
| `LATE_WFH_WEEK_NOT_LOCKED` | Tạo đơn sau hạn khi tuần còn mở | Toast + đưa về khối đăng ký tuần sau |
| `LATE_WFH_PENDING` | Đã có đơn sau hạn đang chờ duyệt cho tuần đó | Điều hướng sang đơn đang chờ |
| `LATE_WFH_QUOTA_EXCEEDED` | Union ngày đã đăng ký + ngày xin > `max_days_per_week` | Highlight chip, nêu số ngày còn xin được |
| `LONG_TERM_WFH_EMPLOYEE_BLOCKED` | Người bị khoá tạo đơn dài hạn | Ẩn CTA; nếu lọt thì toast |
| `LONG_TERM_WFH_RANGE_TOO_SHORT` | Khoảng không phủ đủ 2 tuần ISO | Highlight từ/đến ngày, hint *"Đăng ký dài hạn từ 2 tuần trở lên. 1–2 ngày/tuần thì tick trên lưới."* |
| `LONG_TERM_WFH_FILE_REQUIRED` | Gửi duyệt khi chưa có file | Highlight dropzone |
| `LONG_TERM_WFH_PENDING` | Đã có đơn dài hạn đang chờ duyệt | Điều hướng sang đơn đang chờ |
| `WFH_POLICY_FORBIDDEN` | Không phải HR gọi `PUT /wfh/policy` hoặc CRUD holiday | Ẩn form cấu hình; nếu lọt thì toast |
| `HOLIDAY_DUPLICATE` | Trùng ngày lễ | Highlight dòng ngày |

---

## 6. Màn hình

### 6.1 `/requests/wfh` — Đăng ký WFH

**Thao tác chính là table.** Chọn ngày WFH tuần bằng **checkbox trên từng ô ngày**. Đơn dài hạn có nút tạo + form riêng (§6.5).

Ba tab:

| Tab | Ai thấy | Nội dung |
|---|---|---|
| **Của tôi** | Mọi người (mặc định) | Lưới 1 hàng = user đăng nhập + bảng đơn dài hạn của tôi |
| **Chờ tôi duyệt** | Người là quản lý trực tiếp của ai đó, **hoặc** thuộc nhóm HR, hoặc CEO (kèm badge `long_term_pending_count`) | Bảng đơn `long_term_wfh` `scope=to_approve` — quản lý thấy bước 1, HR thấy bước 2, CEO thấy cả hai (§3.8). Cột `Bước` phân biệt |
| **Toàn công ty** | HR, CEO | Lưới + đơn sau hạn chờ duyệt + đơn dài hạn (§6.3) |

**Header:** tiêu đề + nút secondary `Đăng ký WFH dài hạn` → `/requests/wfh/long-term/create`. Ẩn nút nếu proposer ∈ `blocked_employee_ids`.

#### Bộ lọc — mặc định lúc vào màn

| Bộ lọc | Kiểu | Mặc định |
|---|---|---|
| **Tuần** | `wfh-week-picker` — `Tuần 39 · 14/09 – 20/09` (T2–CN) | **Tuần chứa hôm nay** |
| **Nhân viên** | Combobox (tab Toàn công ty; tab Của tôi ẩn — luôn là mình) | **User đang đăng nhập.** HR xoá filter để xem tất cả |
| Tìm tên | Search, debounce 400ms | — |
| Phòng ban | Select (HR/CEO, tab Toàn công ty) | — |

Đổi tuần → refetch roster + `GET /wfh/weeks?week_start=`.

Tuần đang xem **đã khoá** mà tuần N+1 **còn mở**: banner *"Tuần này đã khoá. Để đăng ký tuần sau, chọn {nhãn N+1}."* — một click đổi bộ lọc Tuần.

#### Lưới — Excel + checkbox

```
              │ 14      15      16      17      18      19      20
 No Fullname           Role │ Mon     Tue     Wed     Thu     Fri     Sat     Sun
 ───┬──────────────────┬────┼─────────┬───────┬───────┬───────┬───────┬───────┬─────
  1 │ NguyenTheHoaiNam  │ DEV │  ☐      │  ☑    │  ☑    │  ■    │  ☐    │  ■    │  ■
                            │         │  WFH  │  WFH  │ (cam) │       │ (xám) │(xám)
```

Header 2 hàng, sticky dọc: số ngày cyan; nhãn `No` · `Fullname` · `Role` · `Mon`…`Sun`.

**Ô ngày = checkbox** căn giữa. Checked = WFH (kèm chữ `WFH`). Unchecked = lên công ty. Control duy nhất là checkbox — không click ô trống.

| Ô | Checkbox | Nền cột |
|---|---|---|
| Ngày làm việc, **được sửa** | Enable; đổi là **lưu ngay** | trắng |
| Ngày làm việc, chỉ xem | Disable; giữ checked nếu đã WFH | trắng |
| `mandatory_office` | Disable, unchecked | cam `#F97316` |
| `holiday` | Disable; tooltip tên lễ | hồng nhạt |
| `weekend` | Disable | xám `#D1D5DB` |
| `wfh_pending` | Disable, checked dashed/amber; mở đơn sau hạn | trắng |

**Ai được tick** (FE disable + BE enforce):

| | Tuần N+1 chưa khoá | Tuần đã khoá hạn | Tuần khác |
|---|---|---|---|
| Chính chủ, hàng mình, **không** bị block | ✅ | ❌ | ❌ |
| Chính chủ ∈ `blocked_employee_ids` | ❌ (hàng khoá như hết hạn) | ❌ | ❌ |
| HR, hàng người bị block | ✅ override | ✅ | ❌ |
| HR, hàng người khác (không block) | ❌ | ✅ §3.6 | ❌ |

Hàng `is_row_locked`: toàn bộ checkbox disable như hết hạn; icon khoá cạnh `Fullname`. `row_lock_reason = employee_blocked` không phụ thuộc tuần đang xem.

`onCheckedChange`: tính `dates` của hàng → nếu vượt `max` thì revert + toast → chính chủ tuần mở (không bị block): `PUT /wfh/registrations` → HR (tuần khoá hạn **hoặc** hàng `employee_blocked`): `PUT /wfh/registrations/override`. Optimistic; lỗi thì rollback.

Toolbar: `Đã chọn n/max` + countdown hạn sửa khi tuần đang xem là N+1 chưa khoá.

`No` / `Fullname` / `Role` sticky ngang. Export Excel: checked → chữ `WFH` như file gốc.

Không còn khối chip "Đăng ký WFH tuần sau". Banner tuần khoá (không phải HR): liên hệ HR; link đơn sau hạn nếu dùng §3.5.

Ô `source = 'long_term'`: checked + disable, tooltip *"WFH dài hạn · đơn {proposal_number}"*. Click `Fullname` / tooltip mở `/requests/wfh/long-term/[id]`. HR vẫn override được trên tuần đã khoá — bỏ tick ghi `hr_updated`, **không** huỷ đơn dài hạn.

**Bảng đơn dài hạn của tôi** — dưới lưới, chỉ hiện khi có ≥ 1 đơn `long_term_wfh` của user:

`Số đơn` · `Từ ngày` · `Đến ngày` · `Lý do` (cắt 80 ký tự) · `Người duyệt` · `Trạng thái` · ⋯

Cột **`Người duyệt`** hiện **cả hai bước** dưới dạng stepper ngang, bước đang chờ được tô đậm:

```
 [✓] Trần Văn Quản lý  →  [•] HR
      đã duyệt 16/09        đang chờ
```

Bước 1 hiện tên người cụ thể; bước 2 hiện nhãn `HR` khi chưa ai thao tác, đổi thành tên người khi `hr_approver` đã có. Trạng thái `rejected` / `changes_requested`: bước bị dừng tô đỏ/cam, các bước sau xám.

Empty: không hiện bảng, chỉ còn nút header.

### 6.2 Lịch sử thay đổi

Mở từ `Fullname` (khi có `registration_id`) hoặc icon lịch sử. Timeline dọc:

- `Nguyễn Thế Hoài Nam đã đăng ký` — T2 21/09, T3 22/09 · *18/09/2026 09:12*
- `Nguyễn Thế Hoài Nam đã sửa` — bỏ T3 22/09, thêm T6 25/09 · *19/09/2026 14:05*
- `Hệ thống đã khoá tuần` — *21/09/2026 00:00*
- `Trần Thị Ngọc Hà đã duyệt đơn sau hạn` — thêm T3 22/09 · *22/09/2026 09:40*
- `Trần Thị Ngọc Hà đã chỉnh (HR)` — bỏ T2 21/09 · *22/09/2026 10:15*
- `Hệ thống đã áp đơn WFH dài hạn` — T2 05/10 … T6 30/10 · *01/10/2026 11:20*

Phần `days_before` / `days_after` trong action log chính là thứ để render dòng "bỏ … thêm …". Diễn biến duyệt/từ chối của đơn sau hạn / dài hạn nằm ở action log của `Request` (màn chi tiết đơn), không trộn vào timeline đăng ký trừ sự kiện `late_approved`, `long_term_approved` và `hr_updated`.

### 6.3 Tab "Toàn công ty" — dành cho HR

Đây là màn giám sát mà HR dùng hằng tuần.

**Khối đơn sau hạn chờ duyệt** — trên cùng, chỉ hiện khi `late_pending_count > 0`:

`Người làm đơn` · `Ngày xin WFH` · `Lý do` · `Gửi lúc` · ⋯ (`Duyệt` / `Từ chối` / `Yêu cầu chỉnh sửa` — đúng UI quyết định của spec chính)

**Khối đơn WFH dài hạn chờ duyệt** — ngay dưới, chỉ hiện khi có đơn `long_term_wfh` `pending` hoặc `pending_hr` toàn công ty. Chia **2 nhóm**, nhóm cần HR ra tay đứng trên:

*Chờ tôi (HR) duyệt* — `status = pending_hr`, đây là việc của HR:

`Người làm đơn` · `Từ ngày` · `Đến ngày` · `Lý do` · `Tài liệu` · `Quản lý đã duyệt` (tên + thời điểm) · ⋯ (`Duyệt` / `Từ chối` / `Yêu cầu chỉnh sửa`)

*Đang chờ quản lý duyệt* — `status = pending`, **chỉ để theo dõi**:

`Người làm đơn` · `Từ ngày` · `Đến ngày` · `Người duyệt bước 1` · `Gửi lúc` · ⋯

HR **không** cần duyệt thay quản lý ở nhóm này — đơn sẽ tự tới bước 2. Nếu quản lý vắng dài ngày thì HR dùng `Đổi người duyệt`; nếu vẫn cần đẩy nhanh thì HR duyệt thay bước 1, nhưng khi đó bước 2 phải do **HR khác hoặc CEO** thao tác (T18) và UI ẩn nút `Duyệt` của chính người đó ở bước 2.

Duyệt bước 2 xong mới materialize lên lưới (T10).

Bên dưới là **cùng lưới tuần** §6.1, `scope=all`.

- Thẻ số liệu trên đầu, tính theo tuần đang lọc: `Đã đăng ký` (số nhân viên có ≥ 1 ô WFH) · `Tổng lượt WFH` · `Đơn sau hạn chờ duyệt` · **`Đơn dài hạn chờ HR duyệt`** (`long_term_hr_pending_count` — việc của HR) · `Đơn dài hạn chờ quản lý` (`long_term_manager_pending_count` — chỉ để biết cái gì sắp tới).
- Tuần **N+1 chưa khoá**: HR **không** tick hàng người khác *trừ* hàng `employee_blocked`. Hàng của HR (nếu xem mình và không bị block) tick được.
- Tuần **đã khoá hạn** hoặc hàng bị khoá đăng ký: HR tick qua override (§3.6).
- Duyệt đơn sau hạn vẫn ở khối trên / màn chi tiết đơn. Chỉnh lưới và duyệt đơn là hai đường; chỉnh lưới sẽ huỷ đơn pending cùng tuần (H7).
- Nếu job card Google Chat tuần này lỗi: nút `Gửi lại tổng hợp tuần` (§7.2), chỉ HR.

### 6.4 `/requests/wfh/late/create` — Form đơn sau hạn

Form 1 trang, tái sử dụng layout form đơn nghỉ (cột phải preview Google Chat). Tiêu đề card: `Tạo đơn xin WFH sau hạn`. **Ẩn** route này (redirect về `/requests/wfh`) nếu proposer ∈ `blocked_employee_ids`.

1. **Thông tin đơn** — `Số đơn` (read-only), `Ngày làm đơn` (mặc định hôm nay), `Người làm đơn` (read-only). Không có `Loại nghỉ`.
2. **Tuần** — read-only, tuần đang chạy lấy từ `GET /wfh/weeks` (mặc định tuần hiện tại). Không chọn tuần khác.
3. **Ngày WFH** — một hàng checkbox giống lưới (§6.1), tuần hiện tại. Ngày đã qua / lễ / bắt buộc disable. Ngày **đã đăng ký** checked + disable (không bỏ từ form này — HR bỏ trên lưới). Bộ đếm: `Đã có {registered} · xin thêm {selected}/{remaining}`.
4. **Lý do** — textarea bắt buộc, 5–500 ký tự.
5. **Người nhận thông báo** — `Người duyệt`: read-only, avatar + tên HR, dòng phụ *"HR"*. Nút `Đổi người duyệt` chỉ hiện với CEO. `Người theo dõi`: multi-select, prefill nhóm HR đã loại người đang là approver.
6. **Footer:** `Huỷ` · `Lưu nháp` · `Gửi duyệt`.

Chi tiết / sửa / duyệt đơn sau hạn ở `/requests/wfh/late/[id]`, tái dùng component chi tiết đơn của spec chính. FE nhận `type = 'late_wfh'` thì render khối chip ngày thay cho khối thời lượng nghỉ.

### 6.5 `/requests/wfh/long-term/create` — Form đơn WFH dài hạn

Form 1 trang, tái sử dụng layout form đơn nghỉ (cột phải preview Google Chat). Tiêu đề card: `Tạo đơn đăng ký WFH dài hạn`. **Ẩn** route (redirect về `/requests/wfh`) nếu proposer ∈ `blocked_employee_ids`.

1. **Thông tin đơn** — `Số đơn` (read-only), `Ngày làm đơn` (mặc định hôm nay), **`Người làm đơn`** (read-only, user đăng nhập — không chọn người khác). Không có `Loại nghỉ`.
2. **Thời gian** — **`Từ ngày`** + **`Đến ngày`** (date picker). Dòng tóm tắt realtime: *"Tổng: {n} ngày làm việc · {from} – {to}"*. Hint: *"Dùng khi WFH liên tục từ 2 tuần trở lên. 1–2 ngày/tuần thì tick trên lưới."* Ẩn radio cả ngày / nửa ngày / theo giờ — luôn `full_day`.
3. **Lý do** — textarea bắt buộc, 5–500 ký tự, đếm ký tự.
4. **Tài liệu đính kèm** — dropzone upload, tái dùng component hiện có (`ListFileRecords` / `media-service`). **Bắt buộc ≥ 1 file**, tối đa 5, mỗi file ≤ 10MB. Danh sách file đã chọn: tên · dung lượng · nút xoá. Chấp nhận PDF, ảnh, DOC/DOCX.
5. **Người duyệt** — read-only, hiện **cả hai bước** theo đúng thứ tự, để người làm đơn biết trước đơn sẽ đi qua những ai:
   - **Bước 1 · Quản lý trực tiếp** — avatar + tên + chức danh, dòng phụ *"Quản lý trực tiếp của bạn"*. Nút `Đổi người duyệt` chỉ hiện với HR/CEO và **chỉ đổi được bước này**.
   - **Bước 2 · HR** — avatar nhóm + nhãn *"Nhóm HR"*, dòng phụ *"Duyệt sau khi quản lý đồng ý"*. Không có nút đổi — bước 2 không gán đích danh (§3.8).

   Dưới hai bước là dòng giải thích: *"Đơn có hiệu lực sau khi cả hai bước duyệt."*

   `Người theo dõi`: multi-select, prefill nhóm HR.
6. **Footer:** `Huỷ` · `Lưu nháp` · `Gửi duyệt`.

Chi tiết / sửa / duyệt ở `/requests/wfh/long-term/[id]`, tái dùng layout chi tiết đơn của spec chính. FE nhận `type = 'long_term_wfh'` thì render khối `Từ ngày – Đến ngày` + `total_days` + danh sách file, không render chip ngày rời hay thời lượng nghỉ.

**Khối tiến độ duyệt** trên màn chi tiết — ngay dưới badge trạng thái, dùng cùng component stepper với bảng ở §6.1:

```
 ●───────────●───────────○
 Gửi duyệt   Quản lý     HR
 15/09 09:12 16/09 10:04 đang chờ
```

Nguồn dữ liệu: `submitted_at` · `manager_decided_by` + `manager_decided_at` · `hr_approver` + `decided_at`. Khi đơn `rejected` / `changes_requested`, bước dừng hiện icon tương ứng + `decision_note` ngay dưới.

**Action bar** chỉ hiện `Duyệt` / `Từ chối` / `Yêu cầu chỉnh sửa` khi caller được phép thao tác **đúng bước hiện tại** theo bảng §3.8 — FE dựa vào `status` + vai trò, BE kiểm lại và trả `REQUEST_NOT_APPROVER` nếu lọt. Nút `Duyệt` ở `pending` ghi nhãn `Duyệt (chuyển HR)` để người quản lý không tưởng mình đang chốt đơn.

Tab **Chờ tôi duyệt** (§6.1): cùng cột với bảng đơn dài hạn của tôi, thêm `Người làm đơn` và cột `Bước` (`Chờ quản lý` / `Chờ HR`). Action bar duyệt dính đáy trên mobile — đúng spec chính §11.3.

### 6.6 Màn **Cấu hình chung**

Không làm form cấu hình trong `/requests/wfh`. HR sửa tại `/settings/general` — **[`general-setting.md`](./general-setting.md)**.

---

## 7. Thông báo

### 7.1 In-app

| Sự kiện | Người nhận | Nội dung |
|---|---|---|
| `wfh.deadline_soon` | Nhân viên **chưa** đăng ký | Gửi sáng chủ nhật: `Hôm nay là hạn đăng ký WFH cho tuần {tuần}` |
| `wfh.locked` | Nhân viên **chưa** đăng ký | Sáng thứ 2: `Tuần {tuần} đã khoá. Quên đăng ký hoặc muốn đổi: liên hệ HR.` |
| `wfh.hr_updated` | Nhân viên bị HR sửa lịch | `HR đã cập nhật WFH tuần {tuần} của bạn: {diff}` |

Đơn sau hạn và đơn dài hạn dùng **đúng** kênh Google Chat + in-app của spec chính (§8): từng đơn một thread.

### 7.3 Google Chat — đơn dài hạn 2 bước

Một đơn vẫn là **một thread**, nhưng có **hai lần @mention** vì có hai người/nhóm phải ra tay:

| Thời điểm | Gửi gì | Mention ai |
|---|---|---|
| Proposer `submit` (`→ pending`) | Message gốc + card, mở thread mới | **Quản lý trực tiếp** (`approver_id`), cc người theo dõi |
| Quản lý duyệt (`→ pending_hr`) | **Reply vào thread** — `✅ {QL} đã duyệt (bước 1/2) · chuyển HR duyệt` — kèm dòng mention mới | **Nhóm HR** (mọi `job_role = 'hr'`), trừ người vừa duyệt và trừ proposer (T18) |
| HR duyệt (`→ approved`) | Reply — `✅ {HR} đã duyệt (bước 2/2) · đơn có hiệu lực, lịch WFH đã cập nhật` | Proposer |
| Từ chối / yêu cầu sửa ở bất kỳ bước nào | Reply theo mẫu spec chính §8.3, **ghi rõ bước bị dừng** | Proposer |

Mỗi reply đồng thời `patch` chip trạng thái trên card gốc: `Chờ quản lý duyệt` → `Chờ HR duyệt` → `Đã duyệt`. Người mở space sau vẫn đọc được đơn đang nằm ở đâu mà không phải cuộn hết thread.

**Không tạo thread thứ hai cho bước 2.** Tách thread sẽ làm mất ngữ cảnh: HR cần đọc đúng lý do và tài liệu mà quản lý đã cân nhắc, và cần thấy quản lý nói gì khi duyệt.

### 7.2 Google Chat — bản tổng hợp tuần (workspace)

Sáng **thứ 2**, sau job khoá tuần, bot đẩy **một card** vào **cùng space** đơn từ (`ERP · Đơn từ`). Không tạo thread theo người — đây là bản tin workspace: *"Tuần này ai WFH ngày nào"*.

- Job ~ **08:00 giờ VN** thứ 2 (sau lock 00:00). Gửi thất bại → retry; HR không bị chặn thao tác ERP. Nút `Gửi lại tổng hợp tuần` trên tab Toàn công ty nếu `digest_status = failed` (HR only).
- BE lưu `wfh_digest_chat_message_name` theo `iso_year + iso_week`. **HR sửa lưới trong tuần** → `patch` card gốc cho khớp, không spam message mới.
- Không @mention từng người (card dài). Nút `Xem lịch WFH` → `/requests/wfh`.

**Card:**

```
┌─────────────────────────────────────────────────────────┐
│  WFH tuần 39 · 14/09 – 20/09                            │
├─────────────────────────────────────────────────────────┤
│  Mon 14   (không ai)                                    │
│  Tue 15   NguyenThiVanAnh, TranVanB                     │
│  Wed 16   NguyenThiVanAnh                               │
│  Thu 17   — ngày bắt buộc lên văn phòng                 │
│  Fri 18   (không ai)                                    │
│  19–20    cuối tuần                                     │
├─────────────────────────────────────────────────────────┤
│  12 người WFH · 18 lượt          [ Xem lịch WFH ]       │
└─────────────────────────────────────────────────────────┘
```

Ngày lễ: dòng `— Nghỉ lễ: {name}` thay vì danh sách người. Không ai WFH cả tuần: vẫn gửi card, dòng `"Tuần này không có đăng ký WFH — mặc định lên công ty."`

Đăng ký tuần **lẻ** (mỗi lần nhân viên bấm Lưu) **không** đẩy Chat.

---

## 8. i18n

```jsonc
"wfh": {
  "title": "Đăng ký WFH",
  "tabs": { "mine": "Của tôi", "toApprove": "Chờ tôi duyệt", "all": "Toàn công ty" },
  "nextWeekCard": {
    "title": "Lịch WFH",
    "week": "Tuần {isoWeek} · {from} – {to}",
    "selected": "Đã chọn {count}/{max} ngày",
    "deadline": "Sửa được tới {time}",
    "deadlineCountdown": "Còn {duration}",
    "locked": "Tuần này đã khoá lúc {time}.",
    "lockedCtaHint": "Quên đăng ký hoặc muốn đổi: liên hệ HR để cập nhật lịch.",
    "lockedBannerEmployee": "Tuần đã khoá — mặc định lên công ty. Muốn đổi, liên hệ HR.",
    "lockedBannerHr": "Tuần đã khoá — tick checkbox để thêm hoặc gỡ WFH.",
    "switchToNextWeek": "Tuần này đã khoá. Để đăng ký tuần sau, chọn {week}.",
    "registeredAt": "Đã đăng ký lúc {time} · đã sửa {count} lần",
    "viewHistory": "Xem lịch sử thay đổi",
    "notEnoughDays": "Tuần này không đủ ngày hợp lệ để đăng ký WFH"
  },
  "policy": {
    "sectionTitle": "Chính sách WFH",
    "maxDays": "Số ngày WFH tối đa mỗi tuần",
    "blockedEmployees": "Nhân viên không được đăng ký WFH",
    "blockedEmployeesHint": "Hàng trên lịch WFH khoá giống sau hết hạn. HR vẫn tick được.",
    "holidays": "Ngày lễ",
    "holidayName": "Tên ngày lễ",
    "yearly": "Lặp hàng năm",
    "addHoliday": "Thêm ngày lễ"
  },
  "digest": {
    "title": "WFH tuần {isoWeek} · {from} – {to}",
    "nobody": "(không ai)",
    "mandatoryOffice": "— ngày bắt buộc lên văn phòng",
    "holiday": "— Nghỉ lễ: {name}",
    "weekend": "cuối tuần",
    "emptyWeek": "Tuần này không có đăng ký WFH — mặc định lên công ty.",
    "footer": "{people} người WFH · {days} lượt",
    "openRoster": "Xem lịch WFH",
    "resend": "Gửi lại tổng hợp tuần"
  },
  "lateRequest": {
    "title": "Tạo đơn xin WFH sau hạn",
    "cta": "Tạo đơn xin WFH sau hạn",
    "viewPending": "Xem đơn đang chờ duyệt",
    "approverHint": "HR",
    "selected": "Đã có {registered} · xin thêm {selected}/{remaining}",
    "alreadyRegistered": "Đã đăng ký"
  },
  "longTermRequest": {
    "title": "Tạo đơn đăng ký WFH dài hạn",
    "cta": "Đăng ký WFH dài hạn",
    "viewPending": "Xem đơn đang chờ duyệt",
    "approverHint": "Quản lý trực tiếp của bạn",
    "rangeHint": "Dùng khi WFH liên tục từ 2 tuần trở lên. 1–2 ngày/tuần thì tick trên lưới.",
    "totalWorkingDays": "Tổng: {count} ngày làm việc · {from} – {to}",
    "attachments": "Tài liệu đính kèm",
    "attachmentsHint": "Bắt buộc ít nhất 1 file (PDF, ảnh, DOC/DOCX). Tối đa 5 file, mỗi file ≤ 10MB.",
    "upload": "Tải tài liệu lên",
    "myTableTitle": "Đơn WFH dài hạn của tôi",
    "pendingTableTitle": "Đơn WFH dài hạn chờ duyệt",
    "hrPendingTableTitle": "Chờ tôi (HR) duyệt",
    "managerPendingTableTitle": "Đang chờ quản lý duyệt",
    "approvalFlowHint": "Đơn có hiệu lực sau khi cả hai bước duyệt.",
    "step": "Bước",
    "stepManager": "Chờ quản lý",
    "stepHr": "Chờ HR",
    "step1Label": "Bước 1 · Quản lý trực tiếp",
    "step2Label": "Bước 2 · HR",
    "step2Hint": "Duyệt sau khi quản lý đồng ý",
    "hrGroup": "Nhóm HR",
    "managerApprovedAt": "Quản lý đã duyệt {time}",
    "approveAndForward": "Duyệt (chuyển HR)",
    "waitingStep": "đang chờ",
    "progressSubmitted": "Gửi duyệt",
    "progressManager": "Quản lý",
    "progressHr": "HR",
    "gridTooltip": "WFH dài hạn · đơn {proposalNumber}",
    "fromDate": "Từ ngày",
    "toDate": "Đến ngày"
  },
  "blockedReason": {
    "holiday": "Nghỉ lễ: {name}",
    "mandatory_office": "Ngày bắt buộc có mặt tại văn phòng",
    "weekend": "Cuối tuần",
    "past": "Ngày đã qua",
    "maxReached": "Tối đa {max} ngày mỗi tuần"
  },
  "grid": {
    "no": "No",
    "fullname": "Fullname",
    "role": "Role",
    "wfh": "WFH",
    "wfhPending": "Đơn sau hạn đang chờ HR duyệt",
    "rowLockedBlocked": "Nhân viên này bị khoá đăng ký WFH.",
    "rowLockedBlockedSelf": "Bạn không được đăng ký WFH. Liên hệ HR."
  },
  "weekday": { "1": "T2", "2": "T3", "3": "T4", "4": "T5", "5": "T6" },
  "weekdayEn": { "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun" },
  "fields": {
    "employee": "Nhân viên",
    "department": "Phòng ban",
    "week": "Tuần",
    "days": "Ngày WFH",
    "note": "Ghi chú",
    "reason": "Lý do",
    "fromDate": "Từ ngày",
    "toDate": "Đến ngày",
    "attachments": "Tài liệu",
    "proposer": "Người làm đơn",
    "approver": "Người duyệt"
  },
  "actions": {
    "save": "Lưu",
    "update": "Cập nhật",
    "withdraw": "Huỷ đăng ký"
  },
  "stats": {
    "registered": "Đã đăng ký",
    "totalDays": "Tổng lượt WFH",
    "latePending": "Đơn sau hạn chờ duyệt",
    "longTermHrPending": "Đơn dài hạn chờ HR duyệt",
    "longTermManagerPending": "Đơn dài hạn chờ quản lý"
  },
  "log": {
    "created": "{actor} đã đăng ký",
    "updated": "{actor} đã sửa",
    "withdrawn": "{actor} đã huỷ đăng ký",
    "locked": "Hệ thống đã khoá tuần",
    "late_approved": "{actor} đã duyệt đơn sau hạn",
    "long_term_manager_approved": "{actor} đã duyệt đơn WFH dài hạn (bước 1/2)",
    "long_term_hr_approved": "{actor} đã duyệt đơn WFH dài hạn (bước 2/2)",
    "hr_updated": "{actor} đã chỉnh (HR)",
    "long_term_approved": "Hệ thống đã áp đơn WFH dài hạn",
    "diff": "bỏ {removed}, thêm {added}"
  },
  "errors": {
    "weekLocked": "Tuần này đã khoá. Tạo đơn xin WFH sau hạn để HR duyệt.",
    "lockedHrOnly": "Chỉ HR được chỉnh WFH sau khi tuần đã khoá.",
    "weekNotLocked": "Tuần này còn mở, nhân viên tự đăng ký trên form tuần sau.",
    "employeeBlocked": "Bạn không được đăng ký WFH. Liên hệ HR.",
    "holidayDuplicate": "Ngày lễ này đã tồn tại.",
    "lateWeekNotLocked": "Tuần này còn mở, hãy đăng ký trực tiếp trên form tuần sau.",
    "latePending": "Bạn đã có đơn WFH sau hạn đang chờ duyệt cho tuần này.",
    "quotaExceeded": "Chỉ xin thêm được {remaining} ngày (tối đa {max}/tuần).",
    "longTermEmployeeBlocked": "Bạn không được đăng ký WFH. Liên hệ HR.",
    "longTermRangeTooShort": "Đăng ký dài hạn từ 2 tuần trở lên. 1–2 ngày/tuần thì tick trên lưới.",
    "longTermFileRequired": "Vui lòng tải lên ít nhất 1 tài liệu.",
    "longTermPending": "Bạn đã có đơn WFH dài hạn đang chờ duyệt.",
    "longTermSameApproverBothSteps": "Bạn đã duyệt bước 1 của đơn này. Bước 2 cần một người HR khác hoặc CEO duyệt."
  }
}
```

---

## 9. Cấu trúc Frontend

```
app/[locale]/(protected)/requests/wfh/
├── page.tsx                      # 3 tab: Của tôi | Chờ tôi duyệt | Toàn công ty
├── [id]/page.tsx                 # Chi tiết đăng ký tuần + lịch sử thay đổi
├── late/
│   ├── create/page.tsx           # Form đơn xin WFH sau hạn (§6.4)
│   └── [id]/page.tsx             # Chi tiết / duyệt đơn sau hạn
└── long-term/
    ├── create/page.tsx           # Form đơn WFH dài hạn (§6.5)
    └── [id]/page.tsx             # Chi tiết / duyệt đơn dài hạn

components/pages/requests/wfh/
├── wfh-week-matrix.tsx           # Lưới tuần — thao tác chính (§6.1)
├── wfh-week-matrix-cell.tsx      # Checkbox WFH / disable / pending
├── wfh-deadline-countdown.tsx
├── wfh-history-timeline.tsx
├── wfh-week-picker.tsx
├── wfh-roster-filters.tsx        # Mặc định: tuần hiện tại + user đăng nhập
├── wfh-late-pending-table.tsx
├── wfh-late-form.tsx
├── wfh-long-term-form.tsx
├── wfh-long-term-table.tsx       # Của tôi / Chờ duyệt / khối HR
├── wfh-long-term-approval-steps.tsx  # Stepper 2 bước — dùng chung bảng + màn chi tiết (§6.1, §6.5)
└── wfh-stats.tsx

# Khối Cấu hình chung — xem general-setting.md
components/pages/settings/general/

lib/types/wfh.ts
lib/services/wfh-service.ts
lib/constants/wfh.ts              # nhãn thứ — KHÔNG chứa "thứ 5 bị khoá"
lib/validations/wfh.schema.ts     # zod đăng ký tuần, đọc giới hạn từ WfhPolicy
lib/validations/late-wfh.schema.ts
lib/validations/long-term-wfh.schema.ts
lib/helpers/wfh-week.ts           # getIsoWeek, formatWeekRange, diffDays cho log
hooks/queries/wfh/
├── use-wfh-policy.ts
├── use-wfh-week.ts               # GET /wfh/weeks?week_start=
├── use-wfh-roster.ts
└── use-wfh-mutations.ts          # upsert checkbox / override HR / policy
hooks/queries/settings/
├── use-holidays.ts
└── use-holiday-mutations.ts
```

Đơn sau hạn / dài hạn: tái dùng `hooks/queries/requests/*` với `type: 'late_wfh'` hoặc `type: 'long_term_wfh'`. Không nhân bản state machine.

**React Query keys:**

```ts
['wfh', 'policy']
['wfh', 'week', weekStart]
['wfh', 'roster', params]
['wfh', 'detail', id]
['settings', 'holidays', params]
```

Sau mỗi mutation đăng ký tuần: invalidate `['wfh']`. Sau duyệt đơn sau hạn / dài hạn: invalidate cả `['wfh']` và `['requests']`.

---

## 10. Trường hợp biên

| Tình huống | Xử lý |
|---|---|
| Nhân viên mở form đúng lúc 23:59 chủ nhật rồi bấm lưu lúc 00:00 | BE trả `WFH_WEEK_LOCKED`; FE toast + chuyển read-only + hiện CTA tạo đơn sau hạn. Không im lặng nuốt thao tác. |
| Không phải HR click lưới tuần đã khoá | FE không bật toggle. Gọi `/override` → `WFH_LOCKED_HR_ONLY`. |
| CEO (không phải HR) xem tab toàn công ty tuần đã khoá | Xem được lưới, **không** click-to-toggle. |
| HR click gỡ hết ngày WFH của một người | `dates = []` → huỷ đăng ký tuần đó; hàng vẫn còn, mọi ô trống. |
| HR chỉnh lưới trong khi nhân viên có đơn sau hạn pending | H7 — đơn bị `cancelled`, thread Chat được reply. |
| Cả tuần sau là tuần lễ dài, không còn ngày hợp lệ | R7 — hiện thông báo, ẩn nút gửi. |
| Tuần sau chỉ còn đúng 1 ngày hợp lệ | Vẫn đăng ký được (tối thiểu 1). Bộ đếm hiện `1/2` với dòng phụ *"Tuần này chỉ còn 1 ngày hợp lệ"*. |
| Nhân viên vào công ty giữa tuần | Vẫn đăng ký được cho tuần sau như mọi người. Tuần đang chạy: chỉ còn đường đơn sau hạn, và chỉ các ngày chưa qua. |
| Nhân viên không đăng ký WFH tuần đó | Vẫn hiện trên lưới, ô ngày làm việc trống (= lên văn phòng). |
| Nhân viên ∈ `blocked_employee_ids` mở màn WFH | Hàng khoá như hết hạn; không tick, không tạo đơn sau hạn. Lịch cũ vẫn hiện. |
| HR thêm người vào list khi họ đang tick tuần N+1 | Lần tick tiếp theo `WFH_EMPLOYEE_BLOCKED`; refetch roster khoá hàng ngay. Đơn late pending bị huỷ. |
| HR gỡ người khỏi list | Hàng mở lại theo quy tắc tuần (N+1 chưa khoá → tự tick được). |
| Nhân viên đã nghỉ việc nhưng còn bản đăng ký tuần sau | HR thấy trong danh sách; record giữ lại để tra cứu. Không tự xoá. |
| Ngày lễ được công bố **sau** khi nhân viên đã đăng ký trúng ngày đó | BE đánh dấu ngày đó `invalid`, thông báo in-app. Chưa khoá → nhân viên tự sửa. Đã khoá → **HR sửa trên lưới** (§3.6). |
| Job tổng hợp Chat sáng T2 thất bại | Card không lên space; HR thấy nút `Gửi lại tổng hợp tuần` trên tab Toàn công ty. Đăng ký WFH trong ERP không bị chặn. |
| HR sửa lưới sau khi card tuần đã gửi | BE `patch` card gốc (§7.2), không gửi thêm message. |
| `GET /wfh/policy` lỗi | Chặn form, hiện lỗi. Không đoán giá trị mặc định (§3.2). |
| Hai tab cùng sửa một bản đăng ký | Lần lưu sau thắng; action log ghi cả hai lần nên vẫn truy được. |
| Xin đơn sau hạn trùng ngày đã đăng ký | FE không cho chọn lại ngày đã có; nếu vẫn lọt, BE coi là no-op trên ngày đó, chỉ union ngày mới. |
| Duyệt đơn sau hạn làm vượt `max_days_per_week` (ví dụ nhân viên vừa được sửa bản đăng ký… không xảy ra sau khoá; hoặc hai đơn — bị L6 chặn) | `LATE_WFH_QUOTA_EXCEEDED`. HR thấy lỗi trên dialog duyệt, không silent truncate. |
| HR tự gửi đơn sau hạn | Người duyệt = CEO. |
| Tuần đã kết thúc (qua 23:59 thứ 6) | Ẩn CTA tạo đơn sau hạn. Đơn `pending` còn lại: HR vẫn duyệt được nhưng BE từ chối nếu mọi `wfh_dates` đều đã qua; nếu còn ngày chưa qua thì chỉ giữ những ngày đó. |
| Nhân viên ∈ `blocked_employee_ids` mở form dài hạn | Redirect `/requests/wfh`; CTA ẩn. Gọi API → `LONG_TERM_WFH_EMPLOYEE_BLOCKED`. |
| Khoảng dài hạn chỉ 1 tuần ISO | `LONG_TERM_WFH_RANGE_TOO_SHORT`; hint dùng lưới tuần. |
| Gửi duyệt dài hạn chưa upload file | Chặn FE; nếu lọt → `LONG_TERM_WFH_FILE_REQUIRED`. |
| Đã có đơn dài hạn pending, tạo thêm | `LONG_TERM_WFH_PENDING` → điều hướng đơn đang chờ. |
| Khoảng dài hạn trùng đơn nghỉ phép pending/approved | `REQUEST_OVERLAPPED` kèm số đơn nghỉ. |
| Quản lý duyệt đơn dài hạn (bước 1) | Đơn chuyển `pending_hr`. Lưới **chưa đổi**. BE reply thread Chat @mention nhóm HR (§7.3). |
| HR duyệt đơn dài hạn (bước 2) | Materialize mọi ngày làm việc trong khoảng lên lưới, bỏ qua max/ngày bắt buộc; ô `source = long_term`, checkbox disable. |
| HR từ chối đơn đã qua bước 1 | Đơn → `rejected`, lưới không đổi, `late_wfh` pending cùng tuần **không** bị huỷ (T16). Reply thread ghi rõ dừng ở bước 2. |
| HR yêu cầu chỉnh sửa ở bước 2 | Đơn → `changes_requested`. Gửi lại thì về `pending` và **quản lý duyệt lại từ đầu** (T17) — nội dung đã đổi nên cái gật đầu cũ hết giá trị. |
| Quản lý trực tiếp của proposer cũng thuộc nhóm HR | Người đó duyệt bước 1; bước 2 do HR khác hoặc CEO (T18). Nhóm HR chỉ còn đúng người đó → fallback CEO. |
| Proposer thuộc nhóm HR | Bước 1 theo org-chart như thường. Bước 2 do HR khác; không còn ai → CEO. Không tự duyệt đơn của mình. |
| Đơn kẹt ở `pending_hr` vì HR nghỉ dài | CEO duyệt thay bước 2. Không có cơ chế tự động duyệt sau N ngày ở v1. |
| Đơn ở `pending_hr` mà proposer huỷ | `cancelled`; lưới không đổi vì chưa materialize. Reply thread + in-app cho quản lý đã duyệt và nhóm HR. |
| Hai HR cùng bấm Duyệt ở bước 2 | Người sau nhận `REQUEST_INVALID_TRANSITION` → toast + refetch. `hr_approver_id` ghi người thắng. |
| Người vừa duyệt bước 1 bấm Duyệt ở bước 2 | `REQUEST_NOT_APPROVER` (T18); FE ẩn sẵn action bar cho người đó. |
| HR bỏ tick một ngày `source = long_term` trên lưới đã khoá | Cho phép (H3); log `hr_updated`. Đơn dài hạn **không** bị huỷ. |
| Huỷ đơn dài hạn `approved` khi `start_date > today` | Gỡ ngày `source = long_term` của đơn đó khỏi tuần chưa diễn ra. |
| Huỷ khi khoảng đã bắt đầu | Chỉ HR/CEO. Gỡ ngày **tương lai**; ngày đã qua giữ trên lưới. |
| Đơn dài hạn pending phủ tuần nhân viên đang tick | Cho tick tuần bình thường. Khi duyệt: union/ghi đè ngày làm việc trong khoảng (T10), log `long_term_approved`. |
| Đơn `late_wfh` pending trùng tuần được đơn dài hạn duyệt | H7 — huỷ `late_wfh`, reply thread Chat. |
| Quản lý (không phải HR) mở tab Toàn công ty | Không thấy tab đó. Thấy **Chờ tôi duyệt** với đơn cấp dưới **đang ở bước 1**; đơn họ đã duyệt biến khỏi tab này và theo dõi tiếp ở `scope=mine` của proposer hoặc màn chi tiết. |
| Org-chart thiếu quản lý trực tiếp | `REQUEST_NO_APPROVER` — chặn gửi, hướng dẫn liên hệ HR (spec chính §7.3). |

---

## 11. Quyết định đã chốt

1. **Cấu hình chính sách WFH** — màn **Cấu hình chung** ([`general-setting.md`](./general-setting.md)): ngày bắt buộc, thời gian khoá, max ngày/tuần, ngày lễ, `blocked_employee_ids`.
2. **Ngày lễ** — HR CRUD trên **Cấu hình chung** (bảng dùng chung với đơn nghỉ phép). WFH resolve vào `WfhWeekInfo.days`. §3.2.1. Spec chính §15 câu 7: cùng nguồn.
3. **Tổng hợp tuần Google Chat** — sáng thứ 2 (~08:00 VN) bot đẩy một card *"ai WFH ngày nào"* vào space workspace; HR sửa lưới thì patch card. §7.2.
4. **Lưới list** — `No × Fullname × Role × Mon–Sun`, **ô = checkbox**. Mặc định lọc **tuần hiện tại** + **nhân viên đang đăng nhập**. §6.1.
5. **Hạn mức phòng ban** — **không**. Không kiểm tra % quân số.
6. **Không đăng ký** — cố tình không đăng ký = **lên công ty cả tuần**, không tạo bản ghi rỗng. Quên hoặc muốn đổi sau khoá → **HR sửa trên lưới** (§3.6).
7. **Bớt ngày sau khoá** — nhân viên không bớt được. HR bớt/thêm trên lưới.
8. **Khoá từng người** — CRUD trên Cấu hình chung ([`general-setting.md`](./general-setting.md) §5). Hàng lưới khoá như hết hạn; HR vẫn tick. §3.2.3.
9. **Đơn WFH dài hạn** — `type = 'long_term_wfh'` trên `RequestRes`. Form: người làm đơn, từ ngày, đến ngày, lý do, tài liệu (upload, ≥ 1 file). Khoảng ≥ 2 tuần ISO. Khi HR duyệt: materialize lên lưới, bỏ qua max ngày/tuần và ngày bắt buộc lên VP. §3.7, §6.5.
10. **Duyệt 2 bước cho đơn dài hạn** — **quản lý trực tiếp → HR**, tuần tự, thêm trạng thái `pending_hr`. Quản lý xác nhận công việc, HR chốt chính sách; đơn chỉ có hiệu lực sau bước 2. Bước 2 là **cả nhóm HR**, ai thao tác trước thì người đó duyệt; một người không gánh cả hai bước. §3.8.
11. **Không duyệt song song** — HR chỉ thấy đơn sau khi quản lý đã duyệt. Cho duyệt song song thì HR phải đọc đơn mà quản lý có thể sẽ từ chối, và không có chỗ ghi nhận việc quản lý đã cân nhắc trước khi HR xét chính sách.
