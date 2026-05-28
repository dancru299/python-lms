Kiểm tra sức khỏe (health check) toàn bộ dự án Python LMS.

## Tham số
`$ARGUMENTS` — (tuỳ chọn) phần cụ thể cần kiểm tra: `types`, `lint`, `build`, `db`, hoặc `all` (mặc định).

## Bước thực hiện

Đảm bảo đang ở thư mục `python-lms/`, sau đó chạy theo `$ARGUMENTS`:

### `types` — Kiểm tra TypeScript
```
npx tsc --noEmit
```
Báo cáo các lỗi type. Không có output = không lỗi.

### `lint` — Kiểm tra ESLint
```
npm run lint
```
Báo cáo các vi phạm linting.

### `build` — Build thử production
```
npm run build
```
Phát hiện lỗi build sẽ không bắt được khi dev. Thường mất 1-3 phút.

### `db` — Kiểm tra kết nối database
```
npx prisma db pull --print
```
Xác nhận DATABASE_URL hoạt động và schema đồng bộ.

### `all` (hoặc không có argument) — Chạy tất cả theo thứ tự
1. TypeScript check
2. ESLint
3. Prisma schema validation (`npx prisma validate`)

Báo cáo tổng kết: ✓ Pass / ✗ Fail cho từng bước, kèm chi tiết lỗi nếu có.

## Lỗi thường gặp và cách xử lý

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|-------------|------------|
| `Cannot find module '.prisma/client'` | Prisma client chưa generate | Chạy `npm run postinstall` |
| `Type error: Property X does not exist` | Schema DB thay đổi nhưng types chưa cập nhật | Chạy `prisma generate` |
| `Environment variable not found` | Thiếu biến trong `.env` | Kiểm tra và bổ sung `.env` |
| `ECONNREFUSED` (database) | Database không kết nối được | Kiểm tra `DATABASE_URL` và Supabase status |
