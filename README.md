# Python LMS

Hệ thống quản lý học tập (LMS) dạy lập trình **Python** cho học sinh, được xây dựng bằng Next.js. Học sinh đọc bài giảng, **chạy code Python ngay trên trình duyệt** (không cần cài đặt), làm bài tập và nộp bài; giáo viên quản lý lớp học, chương trình đào tạo, ra bài tập và chấm điểm.

Giao diện tiếng Việt, dữ liệu lưu trên PostgreSQL (Supabase), triển khai trên Vercel.

---

## Mục lục

- [Tính năng chính](#tính-năng-chính)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Cài đặt & chạy local](#cài-đặt--chạy-local)
- [Tài khoản mặc định](#tài-khoản-mặc-định)
- [Biến môi trường](#biến-môi-trường)
- [Scripts npm](#scripts-npm)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Kiến trúc & ghi chú kỹ thuật](#kiến-trúc--ghi-chú-kỹ-thuật)
- [Triển khai](#triển-khai)
- [Khắc phục sự cố](#khắc-phục-sự-cố)

---

## Tính năng chính

### Cho học sinh
- **Chạy Python trong trình duyệt**: trình soạn thảo Monaco + [Pyodide](https://pyodide.org) chạy trong Web Worker, thực thi code phía client, không gửi lên server.
- **Bài giảng nhiều tab**: nội dung chia theo chương → bài → section, kèm mục tiêu (kiến thức / kỹ năng / thái độ); tiến độ được lưu theo từng tab.
- **Mở khóa bài tuần tự**: các bài trong một chương trình mở khóa lần lượt (hoàn thành tab + bài tập mới mở bài kế tiếp); giáo viên có thể mở khóa thủ công cho từng học sinh.
- **Bài tập & nộp bài**: làm bài, nộp code/đáp án, xem điểm và nhận xét.
- **Lớp học**: tham gia lớp bằng mã lớp, xem lịch học, bài tập về nhà / bài kiểm tra và hạn nộp.
- **Lộ trình học (roadmap)**: theo dõi chương trình đào tạo qua các cột mốc (milestone), chuẩn đầu ra (learning outcome) và cây kỹ năng (skill tree).
- **Giáo trình công khai**: xem trước chương trình (`/giao-trinh`) và các bài giảng được đánh dấu "public preview" mà không cần đăng nhập.
- **Hồ sơ học sinh** và **hộp thư thông báo** trong ứng dụng.

### Cho giáo viên / quản trị
- **Quản lý lớp học**: tạo lớp, mã tham gia, quy luật lịch học lặp lại (vd: Thứ 3 & Thứ 5 hàng tuần), tạo buổi học và bài tập gắn theo buổi.
- **Ra đề & chấm bài**: tạo bài tập (HTML hoặc upload DOCX), template đáp án, chấm điểm, phát hiện nộp trễ.
- **Soạn bài giảng**: trình soạn thảo rich text (TinyMCE), chèn ảnh (upload lên Supabase Storage), chú thích ảnh.
- **Sinh bài giảng bằng AI**: hỗ trợ nhiều nhà cung cấp — Gemini, OpenAI, OpenRouter, Groq, DeepSeek, Qwen.
- **Tạo chương trình từ ebook**: phân tích tài liệu PDF/DOCX để dựng khung curriculum (chương → cột mốc → chuẩn đầu ra → kỹ năng).
- **Quản lý chương trình đào tạo**: cấu trúc Program → Milestone → Learning Outcome → Skill, sắp xếp tự động và gắn bài giảng.
- **Quản lý người dùng, chương, bài giảng** và cấu hình hệ thống.

### Hệ thống
- **Xác thực** bằng cookie session ký HMAC (`SESSION_SECRET`), mật khẩu băm bằng scrypt (có fallback cho hash cũ).
- **Quên mật khẩu qua OTP email** (SMTP, ưu tiên IPv4).
- Phân quyền 3 vai trò: `student`, `teacher`, `admin`.

---

## Công nghệ sử dụng

| Lớp | Công nghệ |
|-----|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript 5 |
| Giao diện | Tailwind CSS 3, Font Awesome, Heroicons, React Hot Toast |
| Cơ sở dữ liệu | PostgreSQL (Supabase) qua [Prisma 5](https://www.prisma.io) ORM |
| Chạy Python | [Pyodide](https://pyodide.org) trong Web Worker + Monaco Editor |
| AI | `@google/generative-ai` và các provider tương thích OpenAI |
| Tài liệu | Mammoth, docx-preview, pdfjs-dist (đọc DOCX/PDF), TinyMCE, isomorphic-dompurify (sanitize HTML) |
| Email | Nodemailer (SMTP) |

---

## Yêu cầu môi trường

- **Node.js** 20 trở lên và **npm**.
- Một cơ sở dữ liệu **PostgreSQL** (khuyến nghị dùng [Supabase](https://supabase.com)).
- (Tùy chọn) API key của một nhà cung cấp AI nếu muốn dùng tính năng sinh bài giảng.

---

## Cài đặt & chạy local

```bash
# 1. Cài dependencies (postinstall sẽ tự chạy `prisma generate`)
npm install

# 2. Tạo file cấu hình từ mẫu rồi điền giá trị
cp .env.example .env

# 3. Tạo schema trên database
npm run db:deploy        # chạy migration (production-safe)
# hoặc: npm run db:push  # đẩy schema thẳng (tiện cho dev)

# 4. Nạp dữ liệu mẫu (tài khoản, chương, bài giảng demo)
npm run db:seed

# 5. Chạy server phát triển
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

> 💡 Tham khảo [DEPLOY.md](./DEPLOY.md) để biết chi tiết cách lấy connection string từ Supabase (transaction pooler vs session pooler).

---

## Tài khoản mặc định

Sau khi chạy `npm run db:seed`, các tài khoản demo sau được tạo sẵn:

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | `admin@example.com` | `admin123` |
| Giáo viên | `teacher@example.com` | `teacher123` |
| Học sinh | `student@example.com` | `student123` |

> ⚠️ Đây chỉ là tài khoản demo cho môi trường phát triển — **đổi mật khẩu (hoặc không seed) trước khi đưa lên production.**

---

## Biến môi trường

Sao chép [.env.example](./.env.example) thành `.env` và điền giá trị. Các nhóm chính:

| Nhóm | Biến | Mô tả |
|------|------|-------|
| Database | `DATABASE_URL` | Kết nối runtime (Supabase transaction pooler, port `6543`, thêm `?pgbouncer=true`). |
| Database | `DIRECT_URL` | Kết nối cho migration (session pooler, port `5432`). |
| Storage | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Lưu ảnh bài giảng trên Supabase Storage (`SERVICE_ROLE_KEY` chỉ dùng phía server). |
| Bảo mật | `SESSION_SECRET` | Khóa ký cookie session (tối thiểu 32 ký tự, **bắt buộc** trên production). |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Gửi OTP đặt lại mật khẩu. Để trống `SMTP_USER`/`SMTP_PASS` sẽ in OTP ra console khi dev. |
| AI | `AI_DEFAULT_PROVIDER` | Provider mặc định: `gemini`, `openai`, `openrouter`, `groq`, `deepseek`, `qwen`. |
| AI | `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `QWEN_API_KEY` | API key tương ứng (chỉ cần key của provider bạn dùng). |
| AI | `AI_*_MODEL` | (Tùy chọn) ghi đè model mặc định cho từng provider. |

---

## Scripts npm

| Lệnh | Tác dụng |
|------|----------|
| `npm run dev` | Chạy server phát triển (Next.js). |
| `npm run build` | Build production. |
| `npm run start` | Chạy bản build production. |
| `npm run lint` | Kiểm tra ESLint. |
| `npm run db:push` | Đẩy schema Prisma thẳng vào DB (không tạo migration). |
| `npm run db:migrate` | Tạo & áp migration mới (dev). |
| `npm run db:deploy` | Áp các migration đã có (production-safe). |
| `npm run db:seed` | Nạp dữ liệu mẫu. |
| `npm run db:seed:programs` | Nạp metadata chương trình đào tạo. |
| `npm run db:studio` | Mở Prisma Studio để xem/sửa dữ liệu. |

> Trên Vercel, build chạy `vercel-build` = `prisma migrate deploy && next build`.

---

## Cấu trúc thư mục

```
python-lms/
├── prisma/
│   ├── schema.prisma          # Mô hình dữ liệu (User, Lesson, Classroom, Program, ...)
│   ├── seed.ts                # Dữ liệu mẫu (tài khoản, chương, bài giảng)
│   └── seed-program-meta.ts   # Metadata chương trình đào tạo
├── public/
│   └── pyodide-worker.js       # Web Worker chạy Python (Pyodide)
├── src/
│   ├── app/                    # App Router: trang & API routes
│   │   ├── (student-shell)/    # Khu vực học sinh (dashboard, lớp học, hồ sơ)
│   │   ├── admin/              # Khu vực giáo viên/quản trị
│   │   ├── api/                # API routes (auth, lessons, classrooms, admin, ...)
│   │   ├── lessons/            # Trang học bài
│   │   ├── giao-trinh/         # Giáo trình công khai
│   │   └── library/            # Thư viện
│   ├── components/             # Component React (lessons, teacher, student, ...)
│   └── lib/                    # Logic dùng chung
│       ├── ai/                 # Sinh bài giảng bằng AI (đa provider)
│       ├── programs/           # Chương trình đào tạo, gating, curriculum
│       ├── python/             # Client điều khiển Pyodide worker
│       ├── auth.ts             # Băm/kiểm tra mật khẩu (scrypt)
│       ├── session.ts          # Quản lý session
│       └── mailer.ts           # Gửi email (SMTP, ưu tiên IPv4)
├── .env.example
├── DEPLOY.md                   # Hướng dẫn triển khai Supabase
└── next.config.ts
```

---

## Kiến trúc & ghi chú kỹ thuật

- **Python chạy phía client**: toàn bộ việc thực thi Python diễn ra trong trình duyệt qua một Web Worker Pyodide dùng chung cho cả trang (chỉ tải runtime một lần, tiết kiệm bộ nhớ). Mỗi lần chạy có giới hạn thời gian (60 giây). Đây là thiết kế có chủ đích — **không** chuyển việc chạy code sang server.
- **Mở khóa tuần tự**: các bài trong một chương trình mở khóa lần lượt; logic ở `src/lib/programs/lesson-gating.ts`. Giáo viên có thể cấp `LessonUnlock` thủ công cho từng học sinh.
- **Prisma trên serverless**: `next.config.ts` đặt `@prisma/client` vào `serverExternalPackages` để query engine hoạt động đúng trên Vercel. Dùng transaction pooler (`pgbouncer=true`) cho runtime và session pooler cho migration.
- **Xác thực**: session lưu trong cookie ký HMAC; mật khẩu băm bằng scrypt, vẫn chấp nhận hash SHA-256 cũ để các tài khoản cũ đăng nhập được.

---

## Triển khai

Ứng dụng được thiết kế để chạy trên **Vercel** (region `syd1` — Sydney) với database **Supabase Postgres** (region Sydney). Lưu ý gói Vercel Hobby giới hạn thời gian chạy function 60 giây.

Các bước chi tiết (tạo project Supabase, lấy connection string, đặt biến môi trường, chạy migration) xem tại **[DEPLOY.md](./DEPLOY.md)**.

---

## Khắc phục sự cố

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Prisma báo lỗi prepared statements / PgBouncer | Đảm bảo `DATABASE_URL` dùng port `6543` và có `?pgbouncer=true`. |
| Migration không chạy | Kiểm tra `DIRECT_URL` dùng port `5432` và user có quyền sửa schema. |
| Kết nối DB timeout | Kiểm tra Supabase project còn active, mật khẩu / region / `PROJECT_REF` đúng, biến môi trường đã set ở môi trường deploy. |
| Email OTP timeout | Mạng chỉ có IPv4 thường gây timeout SMTP qua IPv6 — mailer đã ưu tiên IPv4; kiểm tra App Password của Gmail. |

Xem thêm phần Troubleshooting trong [DEPLOY.md](./DEPLOY.md).
