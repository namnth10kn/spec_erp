# ERP — Cấu hình chung (mock)

Prototype màn `/settings/general` theo [`../general-setting.md`](../general-setting.md): ba card (chính sách WFH, user bị block, ngày lễ) + mock API in-memory.

## Chạy

```bash
cd web
npm install
npm run dev
```

Mở [http://localhost:3000/settings/general](http://localhost:3000/settings/general).

Sidebar **Vai trò demo**: HR (sửa), CEO (chỉ xem), Nhân viên → `/forbidden`.

## Mock API

| Method | Endpoint |
|---|---|
| GET/PUT | `/wfh/policy` |
| GET/POST | `/settings/wfh-blocked-employees` |
| PATCH/DELETE | `/settings/wfh-blocked-employees/:id` |
| GET/POST | `/settings/holidays` |
| PUT/DELETE | `/settings/holidays/:id` |
| GET | `/employees?status=active&search=` |

Header `x-mock-role: hr \| ceo \| staff` (FE tự gửi theo vai trò demo). Store giữ state đến khi restart `next dev`.
