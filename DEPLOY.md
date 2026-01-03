# 🚀 Hướng Dẫn Deploy Python LMS lên Vercel

## Thời gian: 15-20 phút

---

## Bước 1: Tạo Database PostgreSQL (Miễn phí)

1. Truy cập **https://neon.tech**
2. Đăng ký/Đăng nhập (dùng GitHub để nhanh)
3. Click **"New Project"**
   - Project name: `python-lms`
   - Region: Singapore (gần VN nhất)
4. Sau khi tạo xong, copy **Connection String**:
   ```
   postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

---

## Bước 2: Push Code lên GitHub

### Nếu chưa có repo GitHub:

```bash
# Trong thư mục python-lms
git init
git add .
git commit -m "Initial commit"

# Tạo repo mới trên GitHub, sau đó:
git remote add origin https://github.com/YOUR_USERNAME/python-lms.git
git branch -M main
git push -u origin main
```

### Nếu đã có repo:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push
```

---

## Bước 3: Deploy lên Vercel

1. Truy cập **https://vercel.com**
2. Đăng nhập bằng GitHub
3. Click **"Add New Project"**
4. **Import** repo `python-lms` từ GitHub
5. Chờ Vercel nhận diện (thấy Next.js icon)

### Cấu hình Environment Variables:

Trong phần **"Environment Variables"**, thêm:

| Name             | Value                                   |
| ---------------- | --------------------------------------- |
| `DATABASE_URL`   | `postgresql://...` (Paste từ Neon)      |
| `SESSION_SECRET` | `your-super-secret-random-key-32-chars` |

6. Click **"Deploy"**

---

## Bước 4: Khởi tạo Database

Sau khi deploy thành công, cần tạo tables trong database:

### Cách 1: Qua Vercel CLI

```bash
npm i -g vercel
vercel login
vercel env pull  # Lấy env từ Vercel về local

npx prisma db push  # Push schema lên Neon
npx tsx prisma/seed.ts  # (Tùy chọn) Thêm dữ liệu mẫu
```

### Cách 2: Qua Neon Console

1. Vào Neon Dashboard → SQL Editor
2. Copy nội dung từ migration SQL và chạy

---

## Bước 5: Tạo tài khoản Admin

Sau khi database được tạo, truy cập:

```
https://your-app.vercel.app/register
```

Đăng ký tài khoản đầu tiên. Sau đó vào Neon SQL Editor chạy:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'your-email@example.com';
```

---

## ✅ Xong!

Ứng dụng của bạn đã online tại: `https://your-app.vercel.app`

---

## 🔧 Troubleshooting

### Lỗi "Cannot find module '@prisma/client'"

→ Thêm `postinstall` script trong package.json (đã làm)

### Lỗi Database connection

→ Kiểm tra lại DATABASE_URL trong Vercel Environment Variables

### Lỗi Build failed

→ Chạy `npm run build` ở local để kiểm tra lỗi trước

---

## 📝 Lưu ý quan trọng

1. **Miễn phí**:

   - Vercel: Hobby plan miễn phí
   - Neon: Free tier 0.5GB storage

2. **Custom Domain**:

   - Mua domain → Cấu hình trong Vercel Settings → Domains

3. **Cập nhật code**:
   - Chỉ cần `git push` → Vercel tự động redeploy
