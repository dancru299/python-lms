Quản lý database cho dự án Python LMS (Prisma + PostgreSQL/Supabase).

## Tham số
`$ARGUMENTS` — hành động cần thực hiện. Các giá trị hợp lệ:

| Lệnh | Mô tả |
|------|-------|
| `push` | Đồng bộ schema Prisma lên database (dùng khi dev, không tạo migration file) |
| `migrate` | Tạo migration mới và áp dụng lên database |
| `deploy` | Chạy tất cả migration chưa áp dụng (dùng cho production) |
| `seed` | Nạp dữ liệu mẫu vào database |
| `seed-programs` | Nạp dữ liệu meta cho chương trình học |
| `studio` | Mở Prisma Studio (giao diện quản lý DB trực quan) |
| `reset` | Xoá toàn bộ data và reset lại schema (CHÚ Ý: mất dữ liệu!) |
| `status` | Xem trạng thái các migration |

## Bước thực hiện

1. Đảm bảo đang ở thư mục `python-lms/`.
2. Dựa vào `$ARGUMENTS`:
   - `push` → chạy `npm run db:push`
   - `migrate` → chạy `npm run db:migrate`
   - `deploy` → chạy `npm run db:deploy`
   - `seed` → chạy `npm run db:seed`
   - `seed-programs` → chạy `npm run db:seed:programs`
   - `studio` → chạy `npm run db:studio` (mở tại http://localhost:5555)
   - `reset` → **hỏi xác nhận trước**, sau đó chạy `npx prisma migrate reset`
   - `status` → chạy `npx prisma migrate status`
   - Nếu không có argument hoặc không hợp lệ → hiển thị danh sách lệnh trên
3. Báo kết quả cho user.

## Cấu trúc schema chính (prisma/schema.prisma)
- `User` — học viên và giáo viên (role: STUDENT | TEACHER | ADMIN)
- `Chapter` — chương trong khóa học
- `Lesson` — bài học trong chương (có tabs, bài tập code)
- `Classroom` — lớp học, liên kết học viên với bài học
- `Submission` — bài nộp của học viên
- `Notification` — thông báo hệ thống

## Lưu ý
- Cần có `DATABASE_URL` hợp lệ trong `.env`
- Khi thay đổi `prisma/schema.prisma`, phải chạy `push` hoặc `migrate` rồi `postinstall` để tái tạo Prisma Client
