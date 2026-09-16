export const messages = {
  generalSettings: {
    title: "Cấu hình chung",
    wfh: {
      sectionTitle: "Chính sách WFH",
      blockedWeekdays: "Ngày bắt buộc lên văn phòng",
      blockedWeekdaysHint: "Các thứ này không đăng ký WFH được.",
      lockTime: "Thời gian khoá WFH",
      lockTimeHint:
        "Hết mốc này, nhân viên không tự đăng ký tuần sau được. Chỉ HR còn sửa.",
      lockWeekday: "Thứ",
      lockClock: "Giờ",
      maxDays: "Số ngày WFH tối đa mỗi tuần",
      saved: "Đã lưu chính sách WFH.",
    },
    blockedUsers: {
      sectionTitle: "Nhân viên không được đăng ký WFH",
      add: "Thêm người",
      searchPlaceholder: "Tìm nhân viên",
      note: "Ghi chú",
      blockedBy: "Người khoá",
      blockedAt: "Thời điểm",
      editNote: "Sửa ghi chú",
      remove: "Xoá",
      removeConfirm: "Người này sẽ đăng ký WFH được lại theo hạn tuần.",
      empty: "Chưa khoá ai. Nhân viên vẫn tự đăng ký WFH được.",
      addTitle: "Thêm người không được đăng ký WFH",
      editTitle: "Sửa ghi chú",
      employee: "Nhân viên",
      employeePlaceholder: "Tìm theo tên hoặc email",
      added: "Đã thêm vào danh sách.",
      updated: "Đã cập nhật ghi chú.",
      removed: "Đã gỡ khoá WFH.",
      name: "Họ tên",
      role: "Role",
      no: "No",
    },
    holidays: {
      sectionTitle: "Ngày nghỉ lễ trong năm",
      year: "Năm",
      date: "Ngày",
      name: "Tên ngày lễ",
      yearly: "Lặp hàng năm",
      add: "Thêm ngày lễ",
      edit: "Sửa ngày lễ",
      deleteConfirm: "Xoá ngày lễ này?",
      deleteYearlyConfirm:
        "Đây là ngày lễ lặp hàng năm. Xoá sẽ gỡ khỏi mọi năm.",
      added: "Đã thêm ngày lễ.",
      updated: "Đã cập nhật ngày lễ.",
      removed: "Đã xoá ngày lễ.",
    },
    actions: {
      save: "Lưu",
      cancel: "Huỷ",
      add: "Thêm",
      retry: "Thử lại",
      confirm: "Xác nhận",
    },
    errors: {
      forbidden: "Chỉ HR được sửa cấu hình chung.",
      holidayDuplicate: "Ngày lễ này đã tồn tại.",
      blockDuplicate: "Nhân viên này đã nằm trong danh sách.",
      loadFailed: "Không tải được cấu hình. Thử lại.",
      required: "Trường này bắt buộc.",
      invalidMaxDays: "Nhập số nguyên từ 1 đến 5.",
      invalidWeekdays: "Chỉ chọn thứ 2 đến thứ 6, không trùng.",
      invalidDeadline: "Thứ hoặc giờ không hợp lệ.",
      inactiveEmployee: "Không thêm được nhân viên đã nghỉ.",
    },
    common: {
      loading: "Đang tải…",
      noResults: "Không tìm thấy.",
      page: "Trang",
      of: "/",
      readOnly: "Chỉ xem",
      timezone: "Giờ theo Asia/Ho_Chi_Minh",
    },
    nav: {
      settings: "Cài đặt",
      general: "Cấu hình chung",
      requests: "Đơn từ",
      appName: "ERP",
    },
    roles: {
      label: "Vai trò demo",
      hr: "HR",
      ceo: "CEO",
      staff: "Nhân viên",
    },
    forbidden: {
      title: "Không có quyền truy cập",
      body: "Màn Cấu hình chung chỉ dành cho HR và CEO.",
      back: "Về trang chủ",
    },
  },
  weekdays: {
    short: {
      "0": "CN",
      "1": "T2",
      "2": "T3",
      "3": "T4",
      "4": "T5",
      "5": "T6",
      "6": "T7",
    },
    long: {
      "0": "Chủ nhật",
      "1": "Thứ hai",
      "2": "Thứ ba",
      "3": "Thứ tư",
      "4": "Thứ năm",
      "5": "Thứ sáu",
      "6": "Thứ bảy",
    },
  },
} as const;

export type Messages = typeof messages;

export function weekdayShort(day: number) {
  return messages.weekdays.short[String(day) as keyof typeof messages.weekdays.short];
}

export function weekdayLong(day: number) {
  return messages.weekdays.long[String(day) as keyof typeof messages.weekdays.long];
}
