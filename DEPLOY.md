# 🚀 Hướng Dẫn Deploy Python LMS lên iNET Cloud Hosting

## Thời gian: 20-30 phút

---

## Bước 1: Tạo Database MySQL trên iNET

1. Đăng nhập **cPanel** của hosting iNET
2. Vào **MySQL® Databases**
3. Tạo database mới: `python_lms`
4. Tạo user mới với mật khẩu mạnh
5. **Add User to Database** → chọn **ALL PRIVILEGES**
6. Ghi nhớ thông tin:
   ```
   Host: localhost (hoặc IP server)
   Database: ten_cpanel_python_lms
   User: ten_cpanel_user
   Password: your_password
   Port: 3306
   ```

> [!NOTE]
> Trên cPanel, tên database và user thường có prefix là tên tài khoản cPanel, ví dụ: `cpanel123_python_lms`

---

## Bước 2: Cấu hình Environment Variables

Tạo file `.env` trong thư mục dự án trên hosting:

```env
DATABASE_URL="mysql://ten_cpanel_user:your_password@localhost:3306/ten_cpanel_python_lms"
SESSION_SECRET="your-super-secret-random-key-32-chars"
```

---

## Bước 3: Setup Node.js App trên cPanel

1. Vào cPanel → **Setup Node.js App**
2. Click **CREATE APPLICATION**
3. Cấu hình:
   - **Node.js version**: 18.x hoặc 20.x
   - **Application mode**: Production
   - **Application root**: đường dẫn đến thư mục dự án (vd: `python-lms`)
   - **Application startup file**: `node_modules/.bin/next` hoặc tạo file `server.js`
4. Click **CREATE**

### Tạo file server.js (nếu cần):

```javascript
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = false;
const hostname = "0.0.0.0";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

---

## Bước 4: Upload Code & Cài đặt

### Cách 1: Qua Terminal trên cPanel

```bash
# Vào thư mục dự án
cd ~/python-lms

# Clone code từ GitHub
git clone https://github.com/YOUR_USERNAME/python-lms.git .

# Cài đặt dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Tạo tables trong MySQL database
npx prisma db push

# Build Next.js
npm run build

# (Tùy chọn) Seed dữ liệu mẫu
npx tsx prisma/seed.ts
```

### Cách 2: Upload qua File Manager

1. Build ở local: `npm run build`
2. Nén thư mục dự án (trừ `node_modules`)
3. Upload lên cPanel File Manager
4. Giải nén và chạy `npm install` qua Terminal

---

## Bước 5: Tạo tài khoản Admin

1. Truy cập `https://your-domain.com/register`
2. Đăng ký tài khoản đầu tiên
3. Vào **phpMyAdmin** trên cPanel, chạy SQL:

```sql
UPDATE User SET role = 'admin' WHERE email = 'your-email@example.com';
```

---

## ✅ Xong!

Ứng dụng đã online tại: `https://your-domain.com`

---

## 🔧 Troubleshooting

### Lỗi "Cannot find module '@prisma/client'"

→ Chạy `npx prisma generate` trên server

### Lỗi Database connection

→ Kiểm tra DATABASE_URL trong file `.env`, đảm bảo user/password/database đúng

### Lỗi Build failed

→ Chạy `npm run build` ở local để kiểm tra lỗi trước khi deploy

### Lỗi 503 / Application not starting

→ Kiểm tra Node.js version trong cPanel (cần >= 18.x)
→ Kiểm tra file startup (`server.js`) đã đúng chưa

---

## 📝 Lưu ý quan trọng

1. **Node.js Version**: Cần ít nhất Node.js 18.x
2. **MySQL**: Sử dụng MySQL có sẵn trên cPanel (miễn phí)
3. **Custom Domain**: Cấu hình domain trong cPanel → Domains
4. **SSL**: Bật SSL miễn phí qua cPanel → SSL/TLS hoặc Let's Encrypt
5. **Cập nhật code**: Qua SSH/Terminal chạy `git pull && npm install && npm run build`, sau đó restart app trong cPanel
