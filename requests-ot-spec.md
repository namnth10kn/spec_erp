# Spec — Đơn đăng ký OT (Đơn từ ▸ OT)

| | |
|---|---|
| **Thuộc module** | `requests` — mục con **Đơn từ ▸ Đăng ký OT** |
| **Route** | `/requests/ot` |
| **Trạng thái tài liệu** | Draft v3 |
| **Ngày tạo** | 2026-09-16 |
| **Cập nhật** | 2026-09-16 — giờ quy đổi **tách hai phần**: trả lương và cộng vào **quỹ phép OT** (§3.3, §3.9) |
| **Spec anh em** | [`requests-module-spec.md`](./requests-module-spec.md) — phần dùng chung: số đơn, state machine, Google Chat, org-chart<br>[`general-setting.md`](./general-setting.md) §9 — **hệ số OT** + `paid_percent` + trần giờ/tháng + hạn báo cáo muộn; §9.5 — **quỹ phép OT**<br>[`requests-wfh-spec.md`](./requests-wfh-spec.md) — mẫu cho một `type` sống trên màn riêng |

Nhân viên khai **một buổi làm ngoài giờ** thành một đơn, **CEO duyệt**. ERP tính giờ thực tế, phân loại ngày (thường / cuối tuần / lễ), nhân hệ số, **tách phần trả lương với phần chuyển thành phép** và xuất file cho bảng lương.

**Thay đổi ở v3**

- **Giờ quy đổi không còn trả hết bằng tiền.** Hệ số của một loại ngày chia làm hai phần: `paid_percent` (mặc định `100`) trả bằng **lương**, phần dư `rates[x] − paid_percent` chuyển thành **phép OT** — quỹ nghỉ bù tính bằng giờ. Ngày thường `150%` → `100%` lương + `50%` phép. Nguồn cấu hình: [`general-setting.md`](./general-setting.md) §9.1.
- Mỗi đơn mang thêm `ot_paid_percent` · `ot_paid_minutes` · `ot_leave_percent` · `ot_leave_minutes`. Snapshot lúc CEO duyệt **cả hệ số lẫn `paid_percent`**, không chỉ hệ số (§3.3).
- Thêm §3.9 — **cộng phép OT đúng một lần lúc CEO duyệt**, gỡ lại khi huỷ đơn `approved`. Quỹ và sổ cái: [`general-setting.md`](./general-setting.md) §9.5.
- Màn danh sách, khối quy đổi ở màn chi tiết, card Google Chat và file export đều hiện **hai con số** thay vì một `Giờ quy đổi`.

**Thay đổi ở v2**

- **Một đơn OT = một buổi OT = một dự án.** Bỏ bảng buổi con `OvertimeSession`; mọi trường OT nằm phẳng trên `RequestRes`. Làm OT 3 tối trong tuần thì tạo **3 đơn**.
- Bỏ quy tắc "không chồng giờ trong cùng đơn" — không còn nhiều buổi trong một đơn để chồng nhau. Kiểm chồng giờ **giữa các đơn** giữ nguyên (O5).
- Form từ bảng dòng lặp thành **form 1 trang phẳng**. Màn danh sách từ "một dòng = một đơn nhiều buổi" thành **một dòng = một buổi**, nên list và file export dùng chung một bộ cột.

---

## 1. Bối cảnh & Mục tiêu

OT hiện được báo qua chat và file Excel rời, mỗi người một định dạng. Hệ quả: không ai biết tổng giờ OT của một dự án, hệ số nhân tay nên sai, và không có dấu vết ai đã đồng ý cho làm.

Mục tiêu của màn này:

- Mỗi buổi OT là **một bản ghi độc lập** — quy được về đúng ngày, đúng dự án, đúng hệ số.
- Giờ và hệ số do **BE tính**, không ai nhập tay con số quy đổi.
- **CEO duyệt** — OT là chi phí, nên quyết định nằm ở cấp chi tiền.
- Export phẳng để ghép vào bảng lương.

### Nguyên tắc thiết kế

**Không tạo state machine mới.** Đơn OT là `RequestRes` với `type = 'overtime'`, chạy đúng **luồng 1 bước** của [`requests-module-spec.md`](./requests-module-spec.md) §7.1. Khác biệt duy nhất so với đơn nghỉ phép là người duyệt (CEO thay vì quản lý trực tiếp) và một nhóm trường OT.

**Một đơn, một buổi, một dự án.** Không gộp nhiều buổi vào một đơn. Đổi lại sự đơn giản này, mỗi lần OT là một lần duyệt — hệ quả vận hành có thật, xem §3.7 và §11 câu 1.

**Người dùng không nhập số giờ.** Họ nhập `từ` và `đến`; mọi con số — tổng giờ, thứ, loại ngày, hệ số, giờ quy đổi — là **dẫn xuất** do BE tính. FE chỉ hiển thị. Cho nhập tay tổng giờ là mở đường cho số liệu không khớp với khoảng thời gian ngay bên cạnh nó.

---

## 2. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| **Đơn OT** | Một `Request` `type = 'overtime'`. Đúng **một** buổi OT liên tục, **một** dự án, **một** task. |
| **Ngày OT** (`ot_date`) | Ngày **bắt đầu** buổi. Quyết định `thứ` và loại ngày (§3.3). Buổi vắt qua nửa đêm vẫn thuộc `ot_date` của lúc bắt đầu. |
| **Loại ngày** (`day_type`) | `normal` · `weekend` · `holiday`. BE phân loại từ `ot_date`, không phải người dùng chọn. |
| **Hệ số OT** (`rate_percent`) | **Tổng** % nhân cho loại ngày đó. Cấu hình ở [`general-setting.md`](./general-setting.md) §9.1. Mặc định 150 / 200 / 300. |
| **Giờ quy đổi** (`converted_minutes`) | `total_minutes × rate_percent / 100`. **Tổng** của hai phần dưới — không còn là con số bảng lương dùng. |
| **Phần trả lương** (`paid_minutes`) | `total_minutes × paid_percent / 100`. `paid_percent` mặc định `100`. **Đây** mới là con số bảng lương dùng. |
| **Phép OT** (`leave_minutes`) | `total_minutes × (rate_percent − paid_percent) / 100`. Cộng vào quỹ nghỉ bù của nhân viên khi CEO duyệt (§3.9). |
| **Báo cáo muộn** | Gửi đơn cho buổi OT đã diễn ra quá `late_report_days` ngày. **Cảnh báo mềm**, không chặn (§3.4). |

---

## 3. Quy tắc nghiệp vụ

### 3.1 Số đơn

Dùng nguyên `Proposal Number` ở [`requests-module-spec.md`](./requests-module-spec.md) §6.1: `{SEQ}/{MMYY}/{FULLNAME_UPPER}`. **Một buổi OT = một số đơn.**

### 3.2 Quy tắc thời gian và nội dung

```
  Đơn OT 03/0926/NGUYENVANA                      Người duyệt: CEO
  ┌──────────────────────────────────────────────────────────────┐
  │ Ngày OT     15/09/2026        Thứ   T3                       │
  │ Từ          15/09/2026 20:00                                 │
  │ Đến         16/09/2026 01:00                                 │
  │ Tổng        5h00              Loại ngày  Ngày thường (150%)  │
  │ Quy đổi     7h30 = 5h00 trả lương + 2h30 phép OT             │
  ├──────────────────────────────────────────────────────────────┤
  │ Dự án       TKN — Tokengon                                   │
  │ Task name   Deploy release 2.4                               │
  │ Detail      Chạy migration, smoke test, rollback plan        │
  ├──────────────────────────────────────────────────────────────┤
  │ Mô tả       Release trượt hạn do client đổi yêu cầu API…     │
  └──────────────────────────────────────────────────────────────┘
```

| # | Quy tắc | Kiểm ở đâu |
|---|---|---|
| **O1** | `ot_end_at` **>** `ot_start_at`. Bằng nhau cũng không hợp lệ (buổi 0 phút). → `OT_INVALID_RANGE`. | FE + BE |
| **O2** | `ot_date` = ngày của `ot_start_at`, `ot_weekday` = thứ của `ot_date`. Cả hai **read-only**, BE dẫn xuất. FE hiện `thứ` ngay khi chọn ngày. | BE |
| **O3** | Một buổi ≤ **12 giờ**. Dài hơn gần như luôn là nhập sai ngày ở ô `Đến`. → `OT_SESSION_TOO_LONG`. | FE + BE |
| **O4** | `Đến ngày` được sang **hôm sau** (OT vắt nửa đêm), nhưng không quá `ot_start_at + 12h` theo O3. Không cho chọn xa hơn hôm sau. | FE + BE |
| **O5** | Không chồng giờ với đơn OT `pending` / `approved` **khác** của cùng người. → `OT_OVERLAPPED` kèm `proposal_number` của đơn kia. Đơn `rejected` / `cancelled` không tính. | BE |
| **O6** | `project_id` **bắt buộc**, phải là dự án đang hoạt động. Combobox ưu tiên dự án nhân viên đang tham gia, nhưng **không khoá** — người ta vẫn hỗ trợ dự án khác. | FE + BE |
| **O7** | `task_name` **bắt buộc**, 3–200 ký tự. `task_detail` tuỳ chọn, ≤ 1000 ký tự. | FE + BE |

**Một buổi = một dự án + một task.** Làm hai task trong cùng tối thì tạo **hai đơn** với hai khoảng giờ rời — O5 đảm bảo hai khoảng đó không chồng nhau. Không cho một đơn ôm nhiều task, vì giờ OT phải quy được về đúng dự án để tính chi phí.

### 3.3 Loại ngày, hệ số và phần chuyển thành phép

BE phân loại theo `ot_date`, theo thứ tự ưu tiên:

| Thứ tự | `day_type` | Điều kiện |
|---|---|---|
| 1 | `holiday` | `ot_date` trùng bảng ngày lễ ([`general-setting.md`](./general-setting.md) §6), kể cả bản `yearly`. Trả kèm `holiday_name`. |
| 2 | `weekend` | `ot_date` là T7 hoặc CN, và không phải ngày lễ |
| 3 | `normal` | Còn lại (T2–T6) |

`rate_percent` lấy từ `OvertimePolicy.rates` theo `day_type`, `paid_percent` lấy từ `OvertimePolicy.paid_percent` (một con số dùng chung cho cả ba loại ngày — [`general-setting.md`](./general-setting.md) §9.1).

**Giờ OT của một buổi chia làm hai phần:**

```
leave_percent     = rate_percent − paid_percent          (≥ 0, bảo đảm bởi validation §9.4 general-setting)

converted_minutes = round(total_minutes × rate_percent   / 100)   ← tổng, chỉ để hiển thị
paid_minutes      = round(total_minutes × paid_percent   / 100)   ← vào bảng lương
leave_minutes     = converted_minutes − paid_minutes              ← cộng vào quỹ phép OT (§3.9)
```

`leave_minutes` tính bằng **hiệu của hai số đã làm tròn**, không phải `round(total_minutes × leave_percent / 100)` — hai cách cho kết quả lệch nhau 1 phút ở các buổi lẻ, và cách này bảo đảm `paid + leave` luôn **đúng bằng** `converted` trên mọi màn và mọi file export. Bảng lương và quỹ phép không bao giờ cộng lại thiếu một phút so với con số tổng người dùng nhìn thấy.

| Ví dụ — buổi `5h00` | Ngày thường 150% | Cuối tuần 200% | Ngày lễ 300% |
|---|---|---|---|
| Quy đổi | `7h30` | `10h00` | `15h00` |
| Trả lương (`paid_percent = 100`) | `5h00` | `5h00` | `5h00` |
| **Phép OT** | **`2h30`** | **`5h00`** | **`10h00`** |

**Snapshot lúc CEO duyệt là cả hai con số** — `ot_rate_percent` **và** `ot_paid_percent` — không đọc live từ policy. Lý do: HR đổi hệ số hoặc đổi `paid_percent` tháng sau không được phép làm thay đổi con số của đơn đã duyệt và đã đưa vào bảng lương, **cũng không** được làm lệch số phút phép OT đã cộng vào quỹ mà nhân viên có thể đã tiêu một phần. Đơn còn `draft` / `pending` thì hiện giá trị **hiện hành** và tính lại mỗi lần đọc.

**`paid_percent = rate_percent` là hợp lệ** — loại ngày đó không sinh phép OT, `leave_minutes = 0`, đơn vẫn chạy bình thường. FE không hiện khối phép OT khi `leave_minutes = 0` thay vì hiện `0h00`.

**Buổi vắt qua nửa đêm lấy loại ngày của `ot_date`.** Buổi T6 22:00 → T7 02:00 tính **toàn bộ** theo `normal`, không tách 2 giờ sau nửa đêm sang `weekend`. Đây là đơn giản hoá có ý thức — xem §11 câu 2 nếu công ty cần tách.

### 3.4 Gửi trước hay sau khi làm

**Cả hai đều được.** OT thường phát sinh đột xuất, bắt xin phép trước sẽ khiến người ta không khai giờ đã làm.

| `ot_start_at` so với hiện tại | Xử lý |
|---|---|
| Tương lai | Bình thường — đây là xin phép trước |
| Quá khứ, trong `late_report_days` | Bình thường — đây là báo cáo sau |
| Quá khứ, quá `late_report_days` | **Cảnh báo mềm**: dải vàng trên form *"Buổi OT này đã qua {n} ngày — quá hạn báo cáo {m} ngày."* Vẫn gửi được. Card Google Chat gắn nhãn `Báo cáo muộn` để CEO thấy ngay. |

`late_report_days` cấu hình ở [`general-setting.md`](./general-setting.md) §9, mặc định **7**.

**Không chặn cứng** vì chặn sẽ tạo ra giờ OT không bao giờ được ghi nhận — tệ hơn là ghi nhận muộn. Muốn siết thì siết bằng việc CEO thấy nhãn và từ chối, không bằng việc FE không cho gửi.

### 3.5 Description — điều kiện CEO duyệt

`description` trả lời câu *"vì sao buổi OT này là cần thiết"* — thứ CEO cần để quyết định, khác với `task_detail` mô tả buổi đó làm gì về mặt kỹ thuật.

| # | Quy tắc | Kiểm ở đâu |
|---|---|---|
| **O8** | `description` **bắt buộc**, 10–1000 ký tự. Thiếu → không gửi duyệt được. | FE + BE |
| **O9** | BE **kiểm lại `description` ở `approve`**. Trống hoặc < 10 ký tự → `OT_DESCRIPTION_REQUIRED`, chặn duyệt kể cả với CEO. | BE |
| **O10** | CEO thấy `description` sơ sài thì dùng `request_changes` (bắt buộc note) — nhân viên bổ sung rồi gửi lại. Đây là đường chuẩn, không phải duyệt tạm rồi đòi sau. | FE + BE |

O9 trông như dư thừa khi O8 đã chặn ở `submit`, nhưng nó là chốt cuối: đơn tạo bằng API cũ, dữ liệu migrate, hay `PATCH` xoá `description` sau khi submit đều sẽ lọt qua O8. Điều kiện duyệt phải được kiểm **tại lúc duyệt**.

**`description` map vào `reason` sẵn có của `RequestRes`** — không thêm field trùng nghĩa. Form OT đặt nhãn `Mô tả` cho `reason`; `replacement_plan` và `contact_during_leave` không dùng ở loại đơn này.

### 3.6 Trần giờ OT — cảnh báo mềm

`max_hours_per_month` ([`general-setting.md`](./general-setting.md) §9, mặc định `40` giờ, `null` = không kiểm) so với **tổng giờ thực tế** (`total_minutes`, không phải giờ quy đổi) của mọi đơn `approved` + `pending` của người đó trong tháng của `ot_date`, cộng đơn đang gửi.

Vượt trần → **cảnh báo, không chặn**: dải vàng trên form *"Tháng 09/2026 sẽ đạt {x}h OT, vượt trần {y}h."* Card Google Chat gắn nhãn `Vượt trần giờ OT` và CEO thấy con số trước khi duyệt.

Không chặn cứng vì giờ đã làm rồi thì chặn cũng không xoá được nó; điều cần là người quyết định **nhìn thấy**. Trần này để nhắc, và để HR có số liệu khi cần rà soát tuân thủ.

### 3.7 Người duyệt

| # | Quy tắc | Kiểm ở đâu |
|---|---|---|
| **O11** | `approver_id` = người có `position_code = 'ceo'`. **Không** lấy quản lý trực tiếp, **không** lấy leader dự án — khác mọi loại đơn khác trong module. | BE |
| **O12** | Proposer **chính là CEO** → fallback sang **HR** (`bo_division` + `job_role = 'hr'`); không có HR nào → `REQUEST_NO_APPROVER`. Không ai tự duyệt đơn của mình. | BE |
| **O13** | Form hiển thị read-only, dòng phụ *"CEO"*. Nút `Đổi người duyệt` **chỉ CEO** thấy — dùng khi CEO uỷ quyền lúc đi vắng. HR **không** đổi được người duyệt đơn OT. | FE + BE |
| **O14** | Người theo dõi mặc định = nhóm HR (họ cần số liệu cho bảng lương). Người làm đơn thêm/bớt được; **leader của dự án** trong đơn được gợi ý thêm vào. | BE |

**Vì sao CEO chứ không phải quản lý trực tiếp:** OT là chi phí trực tiếp, và quản lý trực tiếp chính là người được lợi khi cấp dưới làm thêm — để họ tự duyệt là bỏ mất lớp kiểm soát duy nhất.

**Hệ quả phải nhìn thẳng:** vì một đơn chỉ chứa một buổi, OT 3 tối trong tuần là **3 đơn và 3 lần CEO bấm duyệt**. Với 20 người làm OT hai lần một tuần, CEO nhận khoảng 40 đơn mỗi tuần. Spec này giảm ma sát bằng hai thứ, nhưng **không** xoá được nó:

- Tab `Chờ tôi duyệt` (§5.1) mặc định **gom nhóm theo nhân viên**, sắp theo `ot_date` — CEO đọc liền mạch OT của một người thay vì nhảy qua lại.
- Nút `Nhân bản` trên đơn đã gửi copy sang nháp mới, giữ nguyên dự án và task — người làm OT nhiều đêm liền không phải gõ lại.

Nếu khối lượng duyệt trở thành vấn đề thật thì lời giải là **duyệt hàng loạt**, không phải gộp buổi trở lại vào một đơn — §11 câu 1.

### 3.8 Xung đột với nghỉ phép và WFH

| Tình huống | Xử lý |
|---|---|
| Buổi OT trùng ngày có đơn nghỉ phép `approved` của cùng người | **Cảnh báo mềm**: *"Ngày này bạn đang có đơn nghỉ {proposal_number}."* Vẫn gửi được — nghỉ nửa ngày rồi tối OT là có thật. |
| Buổi OT trùng ngày WFH đã đăng ký | Không cảnh báo gì. WFH là nơi làm việc, OT là giờ làm việc — hai chuyện độc lập. |
| Buổi OT vào ngày lễ | Không cảnh báo; đây là trường hợp hệ số `holiday` phục vụ. |

### 3.9 Cộng phép OT vào quỹ nghỉ bù

Quỹ, sổ cái và cách tiêu quỹ nằm ở [`general-setting.md`](./general-setting.md) §9.5. Phần này chỉ đặc tả **đơn OT chạm vào quỹ ở những thời điểm nào**.

| # | Quy tắc | Kiểm ở đâu |
|---|---|---|
| **O15** | Cộng phép **đúng một lần, lúc CEO `approve`**. BE ghi một dòng `OvertimeLeaveLedgerEntry` loại `ot_accrual` với `minutes = ot_leave_minutes`, `request_id` = đơn này, kèm `source_day_type` / `source_total_minutes` / `source_leave_percent` để về sau còn giải thích được *"vì sao được 2h30"*. | BE |
| **O16** | **Không** cộng ở `submit`. Đơn có thể bị từ chối, và quỹ phép tăng rồi tụt lại là thứ nhân viên sẽ nhìn thấy và không hiểu. | BE |
| **O17** | `ot_leave_minutes = 0` → **không** ghi ledger. Không tạo dòng `+0h00` làm rác sổ cái. | BE |
| **O18** | Huỷ đơn `approved` → ghi `ot_revoked` với `minutes = −ot_leave_minutes`. Nhân viên đã tiêu quá số đó thì quỹ **được phép âm**, ledger ghi rõ — người ta đã nghỉ thật rồi. HR xử lý bằng `manual_adjustment` ở v2 ([`general-setting.md`](./general-setting.md) §15 câu 7). | BE |
| **O19** | `reject` / `request_changes` / xoá nháp: không chạm ledger. Chỉ `approve` và huỷ-sau-khi-duyệt mới sinh dòng. | BE |
| **O20** | Cộng phép và đổi `status` sang `approved` nằm trong **cùng một transaction**. Duyệt được mà không cộng phép là mất phép của nhân viên; cộng phép mà không duyệt là phép từ trên trời rơi xuống. | BE |

**Phép OT hết hiệu lực tại mốc reset năm phép**, không phải sau 12 tháng kể từ buổi OT ([`general-setting.md`](./general-setting.md) §7.1, §9.5). Hệ quả cần nói thẳng với người dùng: buổi OT tháng 12 sinh ra phép gần như chắc chắn không kịp nghỉ bù. Vì vậy màn chi tiết đơn `approved` hiện dòng phụ *"Phép OT hết hiệu lực {date}"* ngay dưới số phép, chứ không để nhân viên tự tra ở màn khác.

**Nghỉ bù tiêu quỹ này** qua đơn nghỉ `leave_category = 'compensatory_leave'` — [`requests-module-spec.md`](./requests-module-spec.md) §6.6. Đơn OT không biết gì về chiều tiêu; nó chỉ cộng.

---

## 4. Mô hình dữ liệu

### 4.1 Entity

Đơn OT **mở rộng** `RequestRes` (spec chính §5.2) bằng một nhóm trường phẳng. **Không** có bảng con, **không** có entity đơn mới.

```ts
// lib/types/overtime.ts

export const OVERTIME_DAY_TYPES = ['normal', 'weekend', 'holiday'] as const;
export type OvertimeDayType = (typeof OVERTIME_DAY_TYPES)[number];

export interface OvertimeProjectRef {
  id: number;
  code: string;          // "TKN"
  short_name: string;
  name_vi: string;
  leader_id?: number | null;
}

export interface OvertimeWarning {
  code: 'late_report' | 'over_monthly_limit' | 'leave_conflict';
  /** Dữ liệu để dựng câu tiếng Việt ở FE — số ngày trễ, số giờ vượt… */
  meta?: Record<string, string | number>;
}

/** Nhóm trường OT đính vào RequestRes khi type = 'overtime'. */
export interface OvertimeRequestExtras {
  /** Mốc đầu/cuối — datetime đầy đủ vì buổi OT vắt qua nửa đêm được (O4). */
  ot_start_at: string;           // ISO datetime, giờ VN
  ot_end_at: string;

  /** Dẫn xuất từ ot_start_at (O2). Read-only với người dùng. */
  ot_date: string;               // ISO date
  ot_weekday: number;            // 1 = T2 … 7 = CN

  /** = ot_end_at − ot_start_at, đơn vị phút. BE tính (§1 nguyên tắc). */
  ot_total_minutes: number;

  /** Phân loại từ ot_date (§3.3). */
  ot_day_type: OvertimeDayType;
  ot_holiday_name?: string | null;
  /** Snapshot lúc duyệt; đơn chưa duyệt thì là hệ số hiện hành (§3.3). */
  ot_rate_percent: number;
  /** = round(ot_total_minutes × ot_rate_percent / 100). Tổng — chỉ để hiển thị. */
  ot_converted_minutes: number;

  /** Phần hệ số trả bằng lương. Snapshot lúc duyệt cùng ot_rate_percent (§3.3). */
  ot_paid_percent: number;
  /** = ot_rate_percent − ot_paid_percent. BE tính sẵn để FE khỏi trừ lại. */
  ot_leave_percent: number;
  /** = round(ot_total_minutes × ot_paid_percent / 100). Con số bảng lương dùng. */
  ot_paid_minutes: number;
  /** = ot_converted_minutes − ot_paid_minutes. Cộng vào quỹ phép OT khi duyệt (§3.9). */
  ot_leave_minutes: number;
  /** Chỉ đơn `approved`: dòng ledger đã ghi (§3.9 O15). null khi ot_leave_minutes = 0. */
  ot_leave_ledger_entry_id?: number | null;
  /** Chỉ đơn `approved` có phép OT: mốc hết hiệu lực của quỹ (general-setting.md §9.5). */
  ot_leave_expires_at?: string | null;

  project_id: number;
  project?: OvertimeProjectRef | null;

  task_name: string;
  task_detail?: string | null;

  /** Cảnh báo mềm BE tính sẵn để FE không phải suy luận lại (§3.4, §3.6, §3.8). */
  ot_warnings?: OvertimeWarning[];
  /** Tổng giờ OT của tháng chứa ot_date — cho dải cảnh báo trần (§3.6). */
  ot_month_total_minutes?: number;
}
```

`ot_start_at` / `ot_end_at` là **nguồn sự thật**. BE **mirror** sang các trường dùng chung của `RequestRes` để bộ lọc, cột bảng và code chung của module chạy được mà không cần biết gì về OT:

| Trường `RequestRes` | Giá trị khi `type = 'overtime'` |
|---|---|
| `start_date` | Ngày của `ot_start_at` (= `ot_date`) |
| `end_date` | Ngày của `ot_end_at` — **bằng `start_date`, hoặc hơn đúng 1 ngày** khi buổi vắt nửa đêm |
| `start_time` / `end_time` | Giờ `"HH:mm"` của `ot_start_at` / `ot_end_at` |
| `duration_unit` | Luôn `'hours'` |
| `total_hours` | `ot_total_minutes / 60`, làm tròn 2 số |
| `total_days` | `null` — OT không tính theo ngày |
| `reason` | **`description`** của form (§3.5) — bắt buộc 10–1000 ký tự |
| `leave_category` · `half_day_session` · `wfh_week_start` · `wfh_dates` | `null` |
| `replacement_plan` · `contact_during_leave` | `null` — không dùng ở loại đơn này |
| `approver_id` | CEO (§3.7) |

> **Lưu ý cho BE:** `duration_unit = 'hours'` ở đơn nghỉ phép luôn có `end_date = start_date` (spec chính §5.2). Đơn OT là **ngoại lệ duy nhất** được phép `end_date = start_date + 1`. Validator dùng chung phải nới đúng cho `type = 'overtime'`, không nới cho `leave_of_absence`.

### 4.2 Payload

```ts
export interface CreateOvertimePayload {
  /** FE gửi datetime đầy đủ. ot_date / ot_weekday / tổng giờ BE tự tính. */
  ot_start_at: string;
  ot_end_at: string;
  project_id: number;
  task_name: string;
  task_detail?: string;
  /** Map vào RequestRes.reason (§3.5). Bắt buộc 10–1000 ký tự. */
  description: string;
  watcher_ids?: number[];
  /** Chỉ CEO gửi khi uỷ quyền người duyệt (O13). */
  approver_id?: number;
  submit?: boolean;
  /**
   * true = người dùng đã xem và chấp nhận các cảnh báo mềm
   * (báo cáo muộn §3.4, vượt trần §3.6, trùng đơn nghỉ §3.8).
   * BE vẫn trả cảnh báo trong response để card Chat gắn nhãn.
   */
  acknowledge_warnings?: boolean;
}

export type UpdateOvertimePayload = Partial<CreateOvertimePayload>;

export interface QueryParamsOvertime extends QueryParams {
  scope?: 'mine' | 'to_approve' | 'all';
  status?: RequestStatus | RequestStatus[];
  /** Lọc theo ot_date, không phải proposal_date. */
  from_date?: string;
  to_date?: string;
  project_id?: number;
  day_type?: OvertimeDayType;
  proposer_id?: number;
  department_id?: number;
  /** Chỉ đơn có cảnh báo — CEO/HR dùng để rà. */
  has_warnings?: boolean;
  /** Tab "Chờ tôi duyệt" mặc định gom nhóm theo nhân viên (§3.7). */
  group_by?: 'none' | 'proposer';
  sort_by?: 'ot_date' | 'created_at' | 'status' | 'ot_total_minutes';
  sort_order?: 'asc' | 'desc';
}
```

---

## 5. Màn hình

### 5.1 `/requests/ot` — Danh sách

Ba tab:

| Tab | Ai thấy | Nội dung |
|---|---|---|
| **Của tôi** | Mọi người (mặc định) | Đơn OT của user, mọi trạng thái |
| **Chờ tôi duyệt** | **CEO** (+ người được uỷ quyền theo O13) | `scope=to_approve`, kèm badge số. **Mặc định gom nhóm theo nhân viên** (§3.7) |
| **Tất cả** | CEO, HR | Toàn công ty |

**Header:** tiêu đề + nút primary `Tạo đơn OT` → `/requests/ot/create`.

**Thẻ số liệu** — tính theo khoảng ngày đang lọc (mặc định tháng này):

`Giờ OT tháng này` (thực tế) · `Giờ trả lương` · `Phép OT cộng thêm` · `Đơn chờ duyệt` · `Giờ OT đã duyệt năm nay`

Thẻ `Phép OT cộng thêm` chỉ đếm đơn `approved` — phép chỉ tồn tại sau khi CEO duyệt (§3.9). Tab `Của tôi` thêm dòng phụ dưới thẻ này: *"số dư quỹ hiện tại {h} · hết hiệu lực {date}"*, đọc từ `GET /requests/leave-balance` ([`requests-module-spec.md`](./requests-module-spec.md) §9) — nhân viên cần biết **còn bao nhiêu để nghỉ bù**, không chỉ cộng được bao nhiêu trong kỳ đang lọc.

Tab Tất cả thêm thẻ `Người vượt trần giờ` (§3.6) — số nhân viên có tháng nào vượt `max_hours_per_month`.

**Bộ lọc:**

| Bộ lọc | Kiểu | Mặc định |
|---|---|---|
| **Khoảng ngày** | Date range trên `ot_date` | **Tháng hiện tại** |
| Trạng thái | Multi-select 6 trạng thái | — |
| Dự án | Combobox | — |
| Loại ngày | Select `Ngày thường` / `Cuối tuần` / `Ngày lễ` | — |
| Nhân viên | Combobox (tab Tất cả) | — |
| Phòng ban | Select (tab Tất cả) | — |
| Chỉ đơn có cảnh báo | Checkbox (tab Chờ tôi duyệt, Tất cả) | tắt |
| Tìm kiếm | Search theo số đơn / tên / task name, debounce 400ms | — |

**Cột bảng** — một dòng = **một đơn = một buổi OT**:

`Số đơn` · `Người làm đơn`¹ · `Ngày OT` · `Thứ` · `Từ – Đến` · `Tổng giờ` · `Loại ngày` · `Giờ quy đổi` · `Trả lương` · `Phép OT` · `Dự án` · `Task name` · `Trạng thái` · ⋯

¹ Chỉ ở tab `Chờ tôi duyệt` và `Tất cả`.

`Giờ quy đổi` · `Trả lương` · `Phép OT` đứng liền nhau theo thứ tự tổng → hai thành phần, và `Giờ quy đổi` in đậm hơn hai cột kia để đọc được ngay quan hệ *"cái này bằng hai cái sau cộng lại"*. Ô `Phép OT` hiện `—` khi `ot_leave_minutes = 0`, và **xám đi** ở đơn chưa `approved` kèm tooltip *"sẽ cộng khi CEO duyệt"* — con số đó chưa nằm trong quỹ của ai cả (§3.9 O16).

`Từ – Đến` hiện `20:00 – 01:00` và gắn chip `+1` khi buổi vắt nửa đêm, để không ai đọc nhầm thành 19 giờ ngược. `Loại ngày` là chip màu: thường xám, cuối tuần xanh dương, lễ hồng (dùng lại bảng màu badge ở spec chính §7.2).

Dòng có cảnh báo: icon ⚠ cạnh `Số đơn`, tooltip liệt kê loại cảnh báo. Row action menu theo §7.1 spec chính, có `Nhân bản` (§3.7).

**Tab `Chờ tôi duyệt` gom nhóm:** header nhóm là `{tên nhân viên} · {n} đơn · {tổng giờ}`, các đơn bên trong sắp theo `ot_date` tăng dần. CEO đọc hết OT của một người rồi mới sang người khác. Tắt gom nhóm bằng `group_by=none`.

**Empty state:** minh hoạ + CTA `Tạo đơn OT đầu tiên`.

### 5.2 `/requests/ot/create` — Form đơn OT

Form 1 trang, tái dùng layout form đơn nghỉ (cột phải preview Google Chat sticky ≥ lg). Tiêu đề card: `Tạo đơn đăng ký OT`.

1. **Thông tin đơn** — `Số đơn` (read-only), `Ngày làm đơn` (mặc định hôm nay), `Người làm đơn` (read-only). Không có `Loại nghỉ`.

2. **Thời gian OT** — thay hẳn khối `request-duration-fields.tsx` của đơn nghỉ (không có radio cả ngày / nửa ngày / theo giờ):

   ```
   ┌──────────────────────────────────────────────────────────────┐
   │ Ngày OT    [ 15/09/2026 ]      Thứ  T3                       │
   │ Từ giờ     [ 20:00 ]                                         │
   │ Đến ngày   [ 16/09/2026 ▾ ]    Đến giờ  [ 01:00 ]            │
   ├──────────────────────────────────────────────────────────────┤
   │ Tổng 5h00 · Ngày thường · hệ số 150% · quy đổi 7h30          │
   │ → trả lương 5h00 · phép OT 2h30                              │
   └──────────────────────────────────────────────────────────────┘
   ```

   - **`Ngày OT`** — date picker. **`Thứ`** hiện ngay cạnh, read-only, đổi theo ngày (O2).
   - **`Từ giờ`** — time picker. Ngày của mốc `Từ` **chính là** `Ngày OT`, không có ô riêng để tránh hai nguồn sự thật.
   - **`Đến ngày`** — select chỉ **2 lựa chọn**: `Ngày OT` (mặc định) hoặc `hôm sau`. Không phải date picker tự do — O4 chỉ cho phép hai giá trị đó, và một select 2 lựa chọn thì không tạo ra được lỗi "chọn nhầm ngày cách 3 hôm".
   - **`Đến giờ`** — time picker.
   - **Dòng tóm tắt** realtime: tổng giờ, loại ngày, hệ số, giờ quy đổi, và dòng thứ hai tách `trả lương` / `phép OT`. Loại ngày, hệ số và phần tách là preview từ FE; con số chốt vẫn từ BE (§8). Dòng thứ hai ẩn khi `leave_percent = 0`.

3. **Công việc** — `Dự án` (combobox, nhóm `Dự án của tôi` lên đầu, `Dự án khác` bên dưới — O6) · `Task name` (bắt buộc, 3–200) · `Detail` (textarea, ≤ 1000).

4. **Mô tả** — textarea `description`, **bắt buộc**, 10–1000 ký tự, đếm ký tự. Hint: *"CEO cần hiểu vì sao buổi OT này là cần thiết. Đây là điều kiện để duyệt."*

5. **Người nhận thông báo** — `Người duyệt`: read-only, avatar + tên CEO, dòng phụ *"CEO"*. Nút `Đổi người duyệt` chỉ CEO thấy (O13). `Người theo dõi`: multi-select, prefill nhóm HR + gợi ý leader của dự án đã chọn (O14).

6. **Footer:** `Huỷ` · `Lưu nháp` · `Gửi duyệt`.

**Cảnh báo mềm** (báo cáo muộn §3.4, vượt trần §3.6, trùng đơn nghỉ §3.8) hiện thành dải vàng ngay dưới khối liên quan, không dồn xuống cuối form.

`Gửi duyệt` khi còn cảnh báo mềm → dialog xác nhận liệt kê từng cảnh báo, nút `Vẫn gửi` gửi kèm `acknowledge_warnings: true`. Lưu nháp không cần xác nhận.

**Nhân bản** (`/requests/ot/create?from={id}`) prefill dự án, task name, detail, description và giờ; **không** prefill `Ngày OT` — người dùng phải chọn ngày mới, để không vô tình tạo đơn trùng ngày rồi vướng O5.

### 5.3 `/requests/ot/[id]` — Chi tiết / duyệt

Tái dùng layout chi tiết đơn của spec chính §11.3.

- **Cột trái:** card thông tin đơn theo đúng bố cục §3.2 (thời gian → công việc → mô tả), khối thông báo Chat đã gửi.
- **Khối giờ quy đổi** hiện đủ phép tính, không chỉ con số cuối:

  ```
  Tổng giờ        5h00
  Loại ngày       Ngày thường
  Hệ số           150%
  ─────────────────────────────
  Giờ quy đổi     7h30
    Trả lương       5h00   (100%)
    Phép OT         2h30   ( 50%)
  ```

  Hai dòng con thụt vào dưới `Giờ quy đổi` để thấy ngay đây là phần tách của nó, không phải ba con số ngang hàng. Dòng `Phép OT` ẩn khi `ot_leave_minutes = 0`.

  Đơn `approved` thêm hai dòng phụ: *"Hệ số chốt lúc duyệt {date}"* (§3.3) và *"Phép OT đã cộng vào quỹ nghỉ bù · hết hiệu lực {date}"* kèm link tới sổ cái quỹ của chính mình (§3.9). Đơn chưa duyệt thay bằng *"Phép OT sẽ được cộng khi CEO duyệt."*

- **Cột phải:** badge trạng thái + action bar + timeline action log.
- Dải cảnh báo vàng trên đầu nếu đơn có cảnh báo mềm — **CEO phải thấy trước khi bấm Duyệt**, không nằm cuối trang.
- Action bar: `Duyệt` · `Từ chối` · `Yêu cầu chỉnh sửa` (đều theo §7.1 spec chính). Bấm `Duyệt` khi `description` không đạt → toast `OT_DESCRIPTION_REQUIRED` (O9).
- `/requests/ot/[id]/edit` — sửa khi `draft` | `changes_requested`, dùng lại form §5.2.

### 5.4 Export cho bảng lương

`GET /requests/ot/export` — file phẳng, **một dòng = một đơn = một buổi OT**, đúng bộ cột của màn danh sách cộng thêm vài cột kế toán cần:

`Số đơn` · `Nhân viên` · `Email` · `Phòng ban` · `Ngày OT` · `Thứ` · `Bắt đầu` · `Kết thúc` · `Số giờ` · `Loại ngày` · `Tên ngày lễ` · `Hệ số %` · `Giờ quy đổi` · `% trả lương` · `Giờ trả lương` · `% thành phép` · `Giờ phép OT` · `Dự án` · `Task name` · `Detail` · `Trạng thái đơn` · `Ngày duyệt`

Mặc định lọc `status = approved` — bảng lương chỉ dùng đơn đã duyệt. Bỏ filter để đối chiếu.

**Cột kế toán thực sự dùng là `Giờ trả lương`, không phải `Giờ quy đổi`.** Giữ cả hai trong file vì `Giờ quy đổi` là con số nhân viên nhìn thấy trên màn hình và sẽ hỏi lại, nhưng file phải nói rõ cột nào vào bảng lương — nên header sheet ghi chú ngay dưới tiêu đề: *"Cột đưa vào bảng lương: Giờ trả lương. Giờ phép OT đã cộng vào quỹ nghỉ bù, không quy ra tiền."* Đây là chỗ dễ sai nhất của cả tính năng: lấy nhầm `Giờ quy đổi` là trả dư 50% cho mọi buổi OT ngày thường.

`% trả lương` và `% thành phép` là snapshot của đơn (`ot_paid_percent` / `ot_leave_percent`), không phải giá trị policy hiện hành — file export của tháng trước phải tái lập được đúng con số đã chốt lúc đó.

Vì một đơn đã là một buổi, file export **cùng hạt dữ liệu** với màn danh sách: cái CEO/HR nhìn trên màn hình đúng bằng cái mở ra trong Excel.

---

## 6. Thông báo

Dùng **đúng** kênh Google Chat + in-app của spec chính §8. Một đơn = một thread, @mention CEO, `cc` người theo dõi.

**Card OT:**

```
┌──────────────────────────────────────────────────────┐
│ [avatar]  Đăng ký OT · T3 15/09                      │
│           Nguyễn Văn A · 03/0926/NGUYENVANA          │
├──────────────────────────────────────────────────────┤
│  ⏱  Thời gian    15/09 20:00 – 16/09 01:00 · 5h00   │
│  ⚖️  Quy đổi      7h30 (ngày thường · 150%)          │
│                  5h00 lương + 2h30 phép OT           │
│  📁  Dự án        TKN · Deploy release 2.4           │
│  💬  Mô tả        Release trượt hạn do client đổi…   │
│  ⚠️  Lưu ý        Vượt trần giờ OT (tháng 09: 44h)   │
├──────────────────────────────────────────────────────┤
│  Chờ duyệt                        [ Xem chi tiết ]   │
└──────────────────────────────────────────────────────┘
```

Dòng `Lưu ý` **chỉ hiện khi có cảnh báo**. Đây là lý do card OT không bê nguyên card đơn nghỉ: CEO duyệt OT chủ yếu dựa vào giờ + hệ số + cảnh báo, ba thứ đơn nghỉ không có.

Dòng phụ tách lương/phép nằm ngay dưới `Quy đổi` và **ẩn khi `ot_leave_minutes = 0`**. CEO đang duyệt một khoản chi **và** một khoản phép nghỉ bù — hai hệ quả khác nhau, phải thấy cả hai trước khi bấm, không phải mở màn chi tiết mới biết.

Header card ghi `thứ + ngày` chứ không chỉ số đơn — CEO duyệt nhiều đơn OT liền nhau (§3.7) nên cần phân biệt được chúng ngay ở dòng đầu.

**In-app** — thêm vào `lib/constants/notifications.ts`:

| Sự kiện | Người nhận | Nội dung |
|---|---|---|
| `ot.submitted` | CEO | `{proposer} gửi đơn OT {thứ} {ngày} ({h} giờ) cần bạn duyệt` |
| `ot.approved` | proposer, watchers | `Đơn OT {proposal_number} đã được duyệt · {h} giờ trả lương + {l} giờ phép OT` — vế sau lược đi khi `ot_leave_minutes = 0` |
| `ot.rejected` | proposer | `Đơn OT {proposal_number} bị từ chối` |
| `ot.changes_requested` | proposer | `Đơn OT {proposal_number} cần chỉnh sửa` |
| `ot.monthly_limit_reached` | proposer, nhóm HR | `{proposer} đã đạt {x}h OT trong tháng {month}, vượt trần {y}h` — gửi **một lần** mỗi người mỗi tháng, lúc đơn được duyệt làm vượt trần |

`ot.submitted` gửi mỗi đơn một thông báo. Với khối lượng ở §3.7 điều này sẽ ồn — nếu cần gộp thì gộp ở tầng notification (digest theo ngày), không gộp bằng cách nhét nhiều buổi vào một đơn.

---

## 7. Hợp đồng API

Đơn OT dùng nguyên nhóm endpoint `/requests` của spec chính §9. Chỉ thêm ba endpoint riêng.

| Method | Endpoint | Payload / Params | Response |
|---|---|---|---|
| POST | `/requests` | `type: 'overtime'` + `CreateOvertimePayload` | `RequestRes & OvertimeRequestExtras` |
| PATCH | `/requests/:id` | `UpdateOvertimePayload` | `RequestRes & OvertimeRequestExtras` |
| GET | `/requests/:id` | — | `RequestRes & OvertimeRequestExtras` khi `type = 'overtime'` |
| GET | `/requests` | `QueryParamsOvertime` + `type=overtime` | Danh sách đơn OT + `OvertimeMeta` |
| POST | `/requests/:id/submit` \| `/approve` \| `/reject` \| `/request-changes` \| `/cancel` | Như spec chính §9 | `RequestRes & OvertimeRequestExtras` |
| GET | `/requests/ot/form-defaults` | `from?: number` — id đơn nguồn khi Nhân bản | `OvertimeFormDefaults` |
| GET | `/requests/ot/summary` | `from_date` `to_date` `scope?` | `OvertimeSummary` — thẻ số liệu (§5.1) |
| GET | `/requests/ot/export` | `QueryParamsOvertime & QueryParamsExport` | file blob (§5.4) |

```ts
export interface OvertimeFormDefaults {
  proposer: RequestUserRef;
  /** CEO (O11). null → FE chặn gửi duyệt, hiện hướng dẫn liên hệ HR. */
  approver: RequestUserRef | null;
  watchers: RequestUserRef[];
  /** Dự án nhân viên đang tham gia — nhóm lên đầu combobox (O6). */
  my_projects: OvertimeProjectRef[];
  /** Hệ số hiện hành, để FE preview quy đổi realtime (general-setting.md §9.1). */
  rates: { normal: number; weekend: number; holiday: number };
  /** Phần trả bằng lương — FE cần để preview tách lương/phép (§3.3). */
  paid_percent: number;
  max_hours_per_month: number | null;
  late_report_days: number;
  /** Số dư quỹ phép OT hiện tại của proposer, để form hiện "đang có {h} giờ nghỉ bù". */
  ot_leave_remaining_minutes: number;
  ot_leave_expires_at: string | null;
  /** Giờ OT đã dùng trong tháng hiện tại — FE cảnh báo trần ngay khi mở form. */
  month_used_minutes: number;
  chat_space: { name: string; display_name: string } | null;
  /** true khi caller là CEO — mới hiện nút "Đổi người duyệt" (O13). */
  can_override_approver: boolean;
  /** Chỉ có khi gọi kèm `from` — nội dung prefill cho Nhân bản (§5.2). */
  clone_from?: Pick<
    CreateOvertimePayload,
    'project_id' | 'task_name' | 'task_detail' | 'description'
  > & { start_time: string; end_time: string; ends_next_day: boolean };
}

export interface OvertimeSummary {
  total_minutes: number;
  converted_minutes: number;
  /** Tách của converted_minutes (§3.3). paid + leave = converted, luôn khớp. */
  paid_minutes: number;
  /** Chỉ cộng đơn `approved` — phép chỉ tồn tại sau khi duyệt (§3.9 O16). */
  leave_minutes: number;
  pending_count: number;
  approved_minutes_this_year: number;
  /** Chỉ trả cho CEO/HR. */
  employees_over_limit?: number;
}

export interface OvertimeMeta extends PaginationMeta {
  pending_count?: number;
  my_pending_count?: number;
  /** Số đơn có ≥ 1 cảnh báo mềm trong tập đang lọc. */
  warning_count?: number;
  /** Có khi group_by = 'proposer' — để FE dựng header nhóm (§5.1). */
  groups?: Array<{
    proposer_id: number;
    proposer_name: string;
    request_count: number;
    total_minutes: number;
  }>;
}
```

**Mã lỗi:**

| Code | Ý nghĩa | Xử lý UI |
|---|---|---|
| `OT_INVALID_RANGE` | `ot_end_at` ≤ `ot_start_at` (O1) | Highlight `Đến giờ` |
| `OT_SESSION_TOO_LONG` | Buổi > 12 giờ (O3) | Highlight `Đến giờ` + `Đến ngày` |
| `OT_OVERLAPPED` | Chồng giờ với đơn OT khác của cùng người (O5) | Highlight khối thời gian, hiện `proposal_number` kèm link tới đơn kia |
| `OT_PROJECT_INACTIVE` | Dự án đã đóng (O6) | Highlight combobox dự án |
| `OT_DESCRIPTION_REQUIRED` | `description` trống / < 10 ký tự lúc `submit` hoặc `approve` (O8, O9) | Lúc submit: highlight textarea. Lúc approve: toast trên dialog duyệt + gợi ý `Yêu cầu chỉnh sửa` |
| `REQUEST_NO_APPROVER` | Không xác định được CEO, và proposer chính là CEO mà không có HR (O12) | Chặn `Gửi duyệt`, dải cảnh báo kèm hướng dẫn |
| `OT_POLICY_UNAVAILABLE` | Không đọc được `OvertimePolicy` | Chặn form, retry. **Không** đoán hệ số 150/200/300 và **không** đoán `paid_percent = 100` |
| `OT_LEAVE_ACCRUAL_FAILED` | Ghi ledger phép OT lỗi lúc `approve` (§3.9 O20) | Đơn **không** chuyển `approved` — cùng transaction. Toast *"Duyệt chưa hoàn tất, thử lại."* |

---

## 8. Cấu trúc Frontend

```
app/[locale]/(protected)/requests/ot/
├── page.tsx                      # 3 tab: Của tôi | Chờ tôi duyệt | Tất cả
├── create/page.tsx               # Form (§5.2), nhận ?from= cho Nhân bản
└── [id]/
    ├── page.tsx                  # Chi tiết / duyệt (§5.3)
    └── edit/page.tsx             # Sửa khi draft | changes_requested

components/pages/requests/ot/
├── ot-time-fields.tsx            # Ngày OT + thứ + từ giờ + đến ngày/giờ (§5.2)
├── ot-duration-summary.tsx       # Dòng tóm tắt: tổng · loại ngày · hệ số · quy đổi · tách lương/phép
├── ot-rate-breakdown.tsx         # Khối phép tính + tách lương/phép trên màn chi tiết (§5.3)
├── ot-warnings-alert.tsx         # Cảnh báo mềm — dùng ở form và màn chi tiết
├── ot-project-combobox.tsx       # Nhóm "Dự án của tôi" / "Dự án khác"
├── ot-day-type-chip.tsx
├── ot-form.tsx
├── ot-detail-card.tsx
├── ot-stats.tsx
├── ot-grouped-table.tsx          # Bảng gom nhóm theo nhân viên (§5.1)
└── ot-table-columns.tsx

lib/types/overtime.ts
lib/constants/overtime.ts          # OVERTIME_DAY_TYPES, nhãn + màu chip loại ngày
lib/validations/overtime.schema.ts # zod O1–O10, đọc giới hạn từ OvertimePolicy
lib/helpers/overtime-duration.ts   # diffMinutes, formatHours, classifyDayType, splitPaidAndLeave (preview)
lib/helpers/overtime-chat-card.ts  # preview card (§6) — khớp với BE
hooks/queries/requests/ot/
├── use-ot-requests.ts
├── use-ot-request.ts
├── use-ot-mutations.ts
├── use-ot-form-defaults.ts
└── use-ot-summary.ts
```

Tái dùng từ spec chính, **không nhân bản**: `request-approver-field.tsx` · `request-watchers-select.tsx` · `request-action-bar.tsx` · `request-decision-dialog.tsx` · `request-action-log-timeline.tsx` · `request-status-badge.tsx` · `request-notify-status-alert.tsx` · `hooks/queries/requests/use-request-mutations.ts`.

**Không** dùng `request-duration-fields.tsx` — khối thời gian OT có `thứ` read-only và `Đến ngày` chỉ 2 lựa chọn, khác hẳn radio cả ngày / nửa ngày / theo giờ của đơn nghỉ.

**React Query keys:**

```ts
['requests', 'ot', 'list', params]
['requests', 'ot', 'detail', id]
['requests', 'ot', 'summary', params]
['requests', 'ot', 'form-defaults', cloneFromId ?? null]
```

Nằm dưới prefix `['requests']` nên mọi mutation đơn đã invalidate `['requests']` là đủ, badge sidebar cũng refresh theo.

`classifyDayType` ở `overtime-duration.ts` chỉ dùng cho **preview realtime** trên form; phân loại chốt luôn từ BE vì chỉ BE có bảng ngày lễ đầy đủ (kể cả `yearly`). Cùng nguyên tắc với `request-chat-card.ts` (spec chính §12).

`splitPaidAndLeave(totalMinutes, ratePercent, paidPercent)` phải cài **đúng công thức §3.3** — `leave = converted − paid`, không tính `leave` trực tiếp từ `leave_percent`. Cài lệch thì preview trên form và con số BE trả về chênh nhau 1 phút ở các buổi lẻ, và người dùng sẽ báo đó là bug.

---

## 9. i18n

```jsonc
"ot": {
  "title": "Đăng ký OT",
  "createPage": "Tạo đơn đăng ký OT",
  "cta": "Tạo đơn OT",
  "empty": "Bạn chưa có đơn OT nào",
  "tabs": { "mine": "Của tôi", "toApprove": "Chờ tôi duyệt", "all": "Tất cả" },
  "time": {
    "sectionTitle": "Thời gian OT",
    "otDate": "Ngày OT",
    "weekday": "Thứ",
    "fromTime": "Từ giờ",
    "toDate": "Đến ngày",
    "toTime": "Đến giờ",
    "sameDay": "Cùng ngày",
    "nextDay": "Hôm sau",
    "nextDayChip": "+1",
    "range": "{from} – {to}",
    "summary": "Tổng {total} · {dayType} · hệ số {percent}% · quy đổi {converted}",
    "summarySplit": "→ trả lương {paid} · phép OT {leave}"
  },
  "work": {
    "sectionTitle": "Công việc",
    "project": "Dự án",
    "myProjects": "Dự án của tôi",
    "otherProjects": "Dự án khác",
    "taskName": "Task name",
    "taskDetail": "Detail"
  },
  "dayType": {
    "normal": "Ngày thường",
    "weekend": "Cuối tuần",
    "holiday": "Ngày lễ"
  },
  "rate": {
    "sectionTitle": "Giờ quy đổi",
    "totalHours": "Tổng giờ",
    "dayType": "Loại ngày",
    "percent": "Hệ số",
    "converted": "Giờ quy đổi",
    "paid": "Trả lương",
    "otLeave": "Phép OT",
    "paidWithPercent": "{hours} ({percent}%)",
    "snapshotHint": "Hệ số chốt lúc duyệt {date} và không đổi khi chính sách thay đổi.",
    "leaveAccruedHint": "Phép OT đã cộng vào quỹ nghỉ bù · hết hiệu lực {date}",
    "leavePendingHint": "Phép OT sẽ được cộng khi CEO duyệt.",
    "leaveNotYetTooltip": "Sẽ cộng khi CEO duyệt",
    "leaveBalanceHint": "Bạn đang có {hours} giờ nghỉ bù · hết hiệu lực {date}",
    "viewLedger": "Xem sổ cái phép OT"
  },
  "fields": {
    "description": "Mô tả",
    "descriptionHint": "CEO cần hiểu vì sao buổi OT này là cần thiết. Đây là điều kiện để duyệt.",
    "approver": "Người duyệt",
    "approverHint": "CEO"
  },
  "group": {
    "header": "{name} · {count} đơn · {hours}",
    "ungroup": "Bỏ gom nhóm"
  },
  "stats": {
    "monthHours": "Giờ OT tháng này",
    "convertedHours": "Giờ quy đổi",
    "paidHours": "Giờ trả lương",
    "otLeaveHours": "Phép OT cộng thêm",
    "otLeaveBalance": "số dư quỹ hiện tại {hours} · hết hiệu lực {date}",
    "pending": "Đơn chờ duyệt",
    "approvedThisYear": "Giờ OT đã duyệt năm nay",
    "employeesOverLimit": "Người vượt trần giờ"
  },
  "filters": {
    "dateRange": "Khoảng ngày",
    "project": "Dự án",
    "dayType": "Loại ngày",
    "onlyWarnings": "Chỉ đơn có cảnh báo"
  },
  "warnings": {
    "title": "Lưu ý",
    "lateReport": "Buổi OT này đã qua {days} ngày — quá hạn báo cáo {limit} ngày.",
    "lateReportBadge": "Báo cáo muộn",
    "overMonthlyLimit": "Tháng {month} sẽ đạt {hours}h OT, vượt trần {limit}h.",
    "overMonthlyLimitBadge": "Vượt trần giờ OT",
    "leaveConflict": "Ngày này bạn đang có đơn nghỉ {proposalNumber}.",
    "confirmTitle": "Đơn có lưu ý cần xác nhận",
    "confirmSubmit": "Vẫn gửi"
  },
  "actions": {
    "export": "Xuất Excel",
    "duplicate": "Nhân bản",
    "duplicateHint": "Giữ dự án, task và mô tả. Chọn lại ngày OT."
  },
  "errors": {
    "invalidRange": "Giờ kết thúc phải sau giờ bắt đầu.",
    "tooLong": "Một buổi OT không quá 12 giờ.",
    "overlapped": "Khoảng giờ này chồng với đơn OT {proposalNumber}.",
    "projectInactive": "Dự án này đã đóng.",
    "descriptionRequired": "Vui lòng nhập mô tả (10–1000 ký tự) — CEO cần nội dung này để duyệt.",
    "descriptionRequiredOnApprove": "Đơn chưa có mô tả hợp lệ. Dùng Yêu cầu chỉnh sửa để người làm đơn bổ sung.",
    "noApprover": "Chưa xác định được CEO để duyệt đơn OT. Liên hệ HR.",
    "policyUnavailable": "Không tải được cấu hình hệ số OT. Thử lại.",
    "leaveAccrualFailed": "Duyệt chưa hoàn tất — chưa cộng được phép OT vào quỹ. Thử lại."
  }
}
```

Thêm `sidebar.otRequests: "Đăng ký OT"`. Nhãn thứ T2–CN dùng lại `wfh.weekday` — không khai báo bộ thứ hai.

---

## 10. Trường hợp biên

| Tình huống | Xử lý |
|---|---|
| OT vắt qua nửa đêm (`20:00` → `01:00` hôm sau) | Hợp lệ (O4). `end_date = start_date + 1`; bảng hiện `20:00 – 01:00` kèm chip `+1`. |
| OT vắt qua nửa đêm sang **cuối tuần** (T6 22:00 → T7 02:00) | Tính hết theo `normal` của T6. Đơn giản hoá có ý thức — §11 câu 2. |
| OT vắt qua **mốc đổi tháng** (30/09 22:00 → 01/10 01:00) | Trần giờ tính theo tháng của `ot_date` → vào tháng 9 toàn bộ. |
| Chọn `Đến giờ` sớm hơn `Từ giờ` mà `Đến ngày` = cùng ngày | `OT_INVALID_RANGE`. FE gợi ý: *"Có phải bạn muốn chọn Đến ngày = hôm sau?"* |
| Hai đơn OT của cùng người chồng giờ | `OT_OVERLAPPED` kèm link đơn kia. **Chặn cứng** — cùng một người không ở hai chỗ. |
| Chồng giờ với đơn OT `rejected` / `cancelled` | Không chặn — đơn đó không còn hiệu lực. |
| Làm 2 task khác nhau trong cùng tối | Tạo 2 đơn với 2 khoảng giờ **rời nhau**. Nếu khai trùng giờ → O5 chặn. |
| OT nhiều đêm liền cùng dự án | Dùng `Nhân bản` (§5.2): giữ dự án/task/mô tả, chọn lại ngày. |
| HR công bố ngày lễ **sau** khi đơn OT đã duyệt trúng ngày đó | Hệ số đã snapshot nên đơn **không** tự đổi (§3.3). BE gửi in-app cho HR: *"Đơn {number} trúng ngày lễ mới công bố, hệ số cũ là {x}%."* HR quyết định có làm lại đơn không. |
| HR thêm ngày lễ trùng ngày đơn OT `pending` | Đơn chuyển `day_type = holiday` ngay; CEO thấy hệ số 300% khi mở đơn. |
| HR đổi hệ số OT trong khi đơn còn `pending` | Đơn chưa duyệt → tính theo hệ số **mới** khi CEO mở ra xem. Chốt lúc duyệt. |
| HR đổi `paid_percent` trong khi đơn còn `pending` | Như trên — tách lương/phép tính lại theo giá trị mới, chốt lúc duyệt (§3.3). |
| HR nâng `paid_percent` lên bằng `rates.normal` | Đơn ngày thường mới không sinh phép OT nữa; đơn đã duyệt giữ nguyên số phép đã cộng. FE ẩn khối phép OT khi `ot_leave_minutes = 0` (§3.3). |
| Huỷ đơn `approved` mà nhân viên **đã nghỉ bù** hết phần phép đó | Vẫn huỷ, ghi `ot_revoked`, quỹ **âm** (§3.9 O18). Không rollback đơn nghỉ bù đã duyệt — người ta đã nghỉ thật. HR nhận in-app để xử lý tay. |
| Buổi OT `5h37` — làm tròn lẻ | `paid = round(337 × 100/100) = 337`, `leave = converted − paid`. Tổng luôn khớp, không bao giờ lệch 1 phút (§3.3). |
| OT sinh phép vào tháng 12, sát mốc reset năm phép | Phép vẫn cộng bình thường nhưng **hết hiệu lực tại mốc reset** ([`general-setting.md`](./general-setting.md) §9.5). Màn chi tiết hiện mốc đó ngay dưới số phép; hệ thống gửi nhắc trước 60/30/7 ngày. |
| Ghi ledger phép OT lỗi lúc CEO bấm `Duyệt` | Cả transaction rollback — đơn ở lại `pending`, `OT_LEAVE_ACCRUAL_FAILED` (§3.9 O20). Không có trạng thái "đã duyệt nhưng chưa cộng phép". |
| Dự án bị đóng sau khi đơn đã gửi | Đơn `pending` vẫn duyệt được (giờ đã làm rồi). Chỉ chặn ở lúc **tạo/sửa** (O6). |
| Đơn vượt trần giờ tháng | Cảnh báo, không chặn (§3.6). CEO thấy nhãn trên card và dải vàng trên màn chi tiết. |
| Buổi OT trùng ngày nghỉ phép `approved` | Cảnh báo mềm, vẫn gửi (§3.8). |
| Proposer là CEO | `approver_id` fallback HR; không có HR → `REQUEST_NO_APPROVER` (O12). |
| CEO nghỉ dài, đơn OT dồn ở `pending` | CEO uỷ quyền qua `Đổi người duyệt` (O13). Không có duyệt hàng loạt và không tự động duyệt sau N ngày ở v1 — §11 câu 1. |
| Đơn `approved` rồi muốn sửa giờ | Không sửa được. `cancel` rồi `Nhân bản` sang đơn mới. Giờ đã vào bảng lương thì sửa ngầm là không chấp nhận được. |
| Huỷ đơn `approved` sau khi đã chốt bảng lương tháng | ERP cho huỷ và ghi action log; việc điều chỉnh lương nằm ngoài phạm vi. HR nhận in-app. |
| Nhân viên nghỉ việc còn đơn OT `pending` | CEO/HR vẫn duyệt được (giờ đã làm). Record giữ lại. |
| `GET /requests/ot/form-defaults` lỗi | Chặn form, retry. **Không** đoán hệ số (`OT_POLICY_UNAVAILABLE`). |
| Export khi chưa lọc trạng thái | Mặc định chỉ `approved` (§5.4). Muốn cả nháp thì bỏ filter tay. |

---

## 11. Câu hỏi cần chốt

1. **Duyệt hàng loạt cho CEO** — một đơn một buổi nghĩa là CEO có thể nhận ~40 đơn mỗi tuần (§3.7). v1 chỉ có gom nhóm theo nhân viên và `Nhân bản`, không có duyệt hàng loạt. Nếu cần thì thêm `POST /requests/bulk-approve` nhận mảng `id` + một `note` chung, và checkbox chọn nhiều dòng trên tab `Chờ tôi duyệt`. Đây là hướng đúng để giảm ma sát — **không** phải gộp nhiều buổi trở lại vào một đơn, vì gộp sẽ làm mất khả năng từ chối riêng từng buổi.
2. **Buổi OT vắt qua nửa đêm sang loại ngày khác** — hiện tính toàn bộ theo `ot_date` (§3.3). Buổi T6 22:00 → T7 02:00 được `150%` cho cả 4 giờ, dù 2 giờ sau nửa đêm đã là cuối tuần. Nếu công ty trả `200%` cho phần đó thì đơn phải mang **hai** `rate_percent`, và vì thế cũng hai cặp `paid_minutes` / `leave_minutes` — kéo theo khối ở §5.3, card Chat §6 và file export §5.4 đổi cấu trúc. Cần chốt trước khi BE làm.
3. **OT ban đêm có hệ số riêng không** — Bộ luật Lao động VN có phụ cấp làm đêm (22:00–06:00) cộng thêm ngoài hệ số OT. Spec hiện **không** có; nếu cần thì thêm `night_rate_percent` + mốc giờ đêm vào [`general-setting.md`](./general-setting.md) §9 và tách phút đêm trong mỗi đơn.
4. **Trần giờ OT theo năm** — §3.6 chỉ có trần tháng. Luật còn giới hạn 200h/năm. Thêm `max_hours_per_year` thì dùng chung cơ chế cảnh báo mềm, không tốn thêm luồng.
5. **Ai được xem giờ OT của người khác** — §5.1 để CEO/HR ở tab Tất cả. Leader dự án có cần thấy giờ OT của dự án mình không? Hiện họ chỉ thấy nếu được thêm làm người theo dõi từng đơn (O14), không có màn tổng hợp theo dự án.
6. **OT có gắn với worklog Jira không** — `Project.jira_project_key` đã có sẵn cho Delivery Intelligence. Nếu muốn đối chiếu giờ OT khai với worklog thực tế thì cần chốt cách map task và ai chịu trách nhiệm khi hai số lệch nhau.
