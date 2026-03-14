"use client";

import Link from "next/link";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Safely initialize email from search params after hydration
  useEffect(() => {
    const email = searchParams.get("email");
    if (email) {
      setFormData((prev) => ({ ...prev, email }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (formData.otp.length !== 6) {
      setError("Mã OTP phải gồm 6 chữ số");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đặt lại mật khẩu thất bại");
      } else {
        setMessage(data.message);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      setError("Đã xảy ra lỗi, vui lòng thử lại sau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
        Đặt lại mật khẩu
      </h1>
      <p className="text-gray-600 text-center mb-6">
        Nhập mã OTP 6 số và mật khẩu mới của bạn
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <i className="fa-solid fa-circle-check mr-2"></i>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            className="input bg-gray-50"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="your@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mã OTP (6 chữ số)
          </label>
          <input
            type="text"
            maxLength={6}
            className="input text-center text-2xl tracking-widest font-mono"
            placeholder="000000"
            value={formData.otp}
            onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, "") })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu mới
          </label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Xác nhận mật khẩu mới
          </label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-3"
        >
          {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/forgot-password" title="Gửi lại mã OTP mới" className="text-gray-500 hover:text-gray-700 text-sm">
          Gửi lại mã OTP mới
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-4xl">🐍</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Python LMS
            </span>
          </Link>
        </div>

        <Suspense fallback={<div className="card p-8 text-center">Đang tải...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
