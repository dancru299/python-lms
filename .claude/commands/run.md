Khởi động môi trường phát triển cho dự án Python LMS.

## Bước thực hiện

1. Kiểm tra thư mục làm việc có phải là `python-lms/` không. Nếu không, `cd` vào đó.
2. Kiểm tra `node_modules/` đã tồn tại chưa. Nếu chưa, chạy `npm install`.
3. Kiểm tra file `.env` có tồn tại không. Nếu thiếu, cảnh báo user cần tạo file `.env` từ `.env.example` (nếu có) hoặc điền các biến sau:
   - `DATABASE_URL` — PostgreSQL connection string (Supabase)
   - `NEXTAUTH_SECRET` — secret ngẫu nhiên cho NextAuth
   - `NEXTAUTH_URL` — thường là `http://localhost:3000`
   - `GEMINI_API_KEY` — Google Gemini API key
   - `OPENAI_API_KEY` — OpenAI API key (tuỳ chọn)
   - `TINYMCE_API_KEY` — TinyMCE API key
   - Cấu hình SMTP email (nếu dùng Nodemailer)
4. Chạy `npm run dev` trong thư mục `python-lms/`.
5. Sau khi server khởi động, xác nhận app chạy tại `http://localhost:3000`.
6. Báo cho user biết server đã sẵn sàng và các URL quan trọng:
   - App: http://localhost:3000
   - Trang đăng nhập: http://localhost:3000/login
   - Admin dashboard: http://localhost:3000/admin

## Lưu ý
- Project dùng Next.js App Router (Next.js 16, React 19)
- Database: PostgreSQL qua Prisma + Supabase
- Nếu có lỗi Prisma client, chạy `npm run postinstall` (tương đương `prisma generate`)
- Port mặc định là 3000; nếu bị chiếm, Next.js sẽ tự chuyển sang 3001
