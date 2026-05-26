"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          role: formData.role,
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
            {/* Role selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Bạn là</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "student", label: "Học sinh", icon: "fa-graduation-cap", color: "indigo" },
                  { value: "teacher", label: "Giáo viên", icon: "fa-chalkboard-user", color: "purple" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: option.value })}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                      formData.role === option.value
                        ? option.color === "indigo"
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        formData.role === option.value
                          ? option.color === "indigo"
                            ? "bg-indigo-100 text-indigo-600"
                            : "bg-purple-100 text-purple-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <i className={`fa-solid ${option.icon} text-sm`}></i>
                    </div>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

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
              <input
                type="password"
                className="input"
                placeholder="Ít nhất 6 ký tự"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                className="input"
                placeholder="Nhập lại mật khẩu"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
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
