import nodemailer from "nodemailer";
import dns from "node:dns/promises";

const FROM = process.env.SMTP_FROM ?? `"Python LMS" <no-reply@pythonlms.edu>`;

// Some networks resolve mail hosts (e.g. smtp.gmail.com) to an IPv6 address but
// have no working IPv6 route, so the SMTP socket hangs and fails with
// ETIMEDOUT. nodemailer (v7) ignores the `family`/`lookup` options, so we
// resolve an IPv4 address ourselves and connect by IP — keeping the original
// hostname as the TLS servername so certificate validation still passes.
// Falls back to the hostname when IPv4 resolution isn't available.
async function createTransporter() {
  const host = process.env.SMTP_HOST;
  let connectHost = host;
  let tls: { servername: string } | undefined;

  if (host) {
    try {
      const { address } = await dns.lookup(host, { family: 4 });
      connectHost = address;
      tls = { servername: host };
    } catch {
      // Leave connectHost as the hostname and let nodemailer resolve it.
    }
  }

  return nodemailer.createTransport({
    host: connectHost,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    ...(tls ? { tls } : {}),
  });
}

export async function sendPasswordResetOtp(email: string, otp: string) {
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Mã xác nhận đặt lại mật khẩu – Python LMS",
    text: `Mã OTP của bạn là: ${otp}\nMã có hiệu lực trong 15 phút.`,
    html: `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,.8);letter-spacing:1px;text-transform:uppercase;">Python LMS</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff;">Đặt lại mật khẩu</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 12px;color:#374151;font-size:15px;">Xin chào,</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.<br/>
              Sử dụng mã OTP bên dưới để tiếp tục:
            </p>

            <!-- OTP box -->
            <div style="background:#f5f3ff;border:2px dashed #a78bfa;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:12px;color:#7c3aed;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Mã xác nhận</p>
              <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:10px;color:#4f46e5;font-family:monospace;">${otp}</p>
            </div>

            <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;text-align:center;">
              <i>⏱ Mã có hiệu lực trong <strong>15 phút</strong></i>
            </p>
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
              Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#d1d5db;font-size:11px;">© 2025 Python LMS · Email này được gửi tự động, vui lòng không trả lời.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
