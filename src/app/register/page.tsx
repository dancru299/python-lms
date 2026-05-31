"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đăng ký thất bại");
        return;
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        if (loginData.user.role === "teacher" || loginData.user.role === "admin") {
          window.location.replace("/admin");
        } else {
          window.location.replace("/");
        }
      } else {
        window.location.replace("/login");
      }
    } catch {
      setError("Đã xảy ra lỗi, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-between bg-[linear-gradient(135deg,_#312e81_0%,_#4f46e5_45%,_#7c3aed_100%)] px-12 py-10 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <i className="fa-solid fa-graduation-cap text-white"></i>
            </div>
            <span className="text-lg font-bold">Python LMS</span>
          </div>
        </div>

        <div>
          <blockquote className="text-2xl font-semibold leading-snug text-white/95">
            "Bắt đầu hành trình học Python với lộ trình có cấu trúc và sự hỗ trợ từ giáo viên."
          </blockquote>
          <div className="mt-8 space-y-4">
            {[
              { icon: "fa-circle-check", text: "Tạo tài khoản miễn phí trong vài giây" },
              { icon: "fa-book-open", text: "Truy cập bài giảng ngay sau khi đăng ký" },
              { icon: "fa-comments", text: "Nhận phản hồi từ giáo viên theo từng bài" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-sm text-indigo-100">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <i className={`fa-solid ${item.icon} text-[11px]`}></i>
                </div>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-indigo-300">
          © {new Date().getFullYear()} Python LMS. Hệ thống học tập trực tuyến.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-5 py-10 sm:px-10">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
            <i className="fa-solid fa-graduation-cap text-white"></i>
          </div>
          <span className="text-xl font-bold text-slate-900">Python LMS</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900">Tạo tài khoản</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Đã có tài khoản?{" "}
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
                Đăng nhập
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Họ và tên</label>
              <input
                type="text"
                className="input"
                placeholder="Nguyễn Văn A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input !pr-11"
                  placeholder="Ít nhất 6 ký tự"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="input !pr-11"
                  placeholder="Nhập lại mật khẩu"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  <i className={`fa-solid ${showConfirmPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-user-plus"></i>
                  Đăng ký
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"
            >
              <i className="fa-solid fa-arrow-left"></i>
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
