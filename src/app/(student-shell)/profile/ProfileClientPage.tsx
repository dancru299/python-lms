"use client";

import Link from "next/link";
import { useState } from "react";
import StudentPageFrame from "@/components/student/StudentPageFrame";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  profile?: {
    age?: number | null;
    gender?: string | null;
    gradeLevel?: string | null;
    school?: string | null;
    phone?: string | null;
  } | null;
}

interface ProfileClientPageProps {
  initialUser: UserProfile;
}

function buildInitialForm(user: UserProfile) {
  return {
    name: user.name || "",
    age: user.profile?.age ? String(user.profile.age) : "",
    gender: user.profile?.gender || "",
    gradeLevel: user.profile?.gradeLevel || "",
    school: user.profile?.school || "",
    phone: user.profile?.phone || "",
  };
}

export default function ProfileClientPage({
  initialUser,
}: ProfileClientPageProps) {
  const loading = false;
  const setLoading = (_value: boolean) => undefined;
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [form, setForm] = useState(() => buildInitialForm(initialUser));

  if (false) {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          window.location.href = "/login";
          return;
        }

        const data = await res.json();
        setUser(data.user);
        setForm({
          name: data.user.name || "",
          age: data.user.profile?.age ? String(data.user.profile.age) : "",
          gender: data.user.profile?.gender || "",
          gradeLevel: data.user.profile?.gradeLevel || "",
          school: data.user.profile?.school || "",
          phone: data.user.profile?.phone || "",
        });
      } catch {
        alert("Không thể tải hồ sơ");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }

  const handleSave = async () => {
    if (!user || user.role !== "student") {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          age: form.age ? Number(form.age) : null,
          gender: form.gender,
          gradeLevel: form.gradeLevel,
          school: form.school,
          phone: form.phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Không thể cập nhật hồ sơ");
        return;
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: form.name,
              profile: {
                age: form.age ? Number(form.age) : null,
                gender: form.gender || null,
                gradeLevel: form.gradeLevel || null,
                school: form.school || null,
                phone: form.phone || null,
              },
            }
          : prev
      );
      alert("Cập nhật hồ sơ thành công");
    } catch {
      alert("Đã xảy ra lỗi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
          <p className="mt-4 text-sm text-slate-500">Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const editable = user.role === "student";

  return (
    <StudentPageFrame
      title="Hồ sơ cá nhân"
      subtitle="Các trường thông tin được chia theo nhóm rõ ràng để bạn cập nhật nhanh, đồng thời giữ được góc nhìn tổng quan về vai trò và trạng thái tài khoản."
      summaryPills={[
        { label: "Vai trò", value: user.role === "student" ? "Học sinh" : user.role, tone: "indigo" },
        { label: "Email", value: user.email, tone: "slate" },
        { label: "Trạng thái chỉnh sửa", value: editable ? "Có thể cập nhật" : "Chỉ xem", tone: "emerald" },
      ]}
      primaryAction={{
        href: "/",
        label: "Về tổng quan",
        icon: "fa-house",
      }}
      secondaryAction={{
        href: "/classrooms",
        label: "Xem lớp học",
        icon: "fa-users",
      }}
      sectionLinks={[
        { href: "#thong-tin", label: "Thông tin cơ bản" },
        { href: "#hoc-tap", label: "Thông tin học tập" },
        { href: "#lien-he", label: "Liên hệ" },
      ]}
    >
      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Hồ sơ đang hiển thị",
            value: user.name,
            description: "Tên này sẽ xuất hiện trong giao diện học tập và chấm bài.",
            icon: "fa-user",
            iconClass: "bg-indigo-100 text-indigo-600",
          },
          {
            label: "Thông tin học tập",
            value: user.profile?.gradeLevel || "Chưa cập nhật",
            description: "Khối lớp hoặc lớp học hiện tại để giáo viên dễ theo dõi.",
            icon: "fa-school",
            iconClass: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "Số điện thoại",
            value: user.profile?.phone || "Chưa cập nhật",
            description: "Thông tin liên hệ khi cần trao đổi thêm.",
            icon: "fa-phone",
            iconClass: "bg-amber-100 text-amber-600",
          },
        ].map((item) => (
          <div key={item.label} className="card rounded-[1.5rem] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">{item.label}</div>
                <div className="mt-3 text-xl font-bold text-slate-900 break-words">{item.value}</div>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconClass}`}>
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">{item.description}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.7fr,1fr]">
        <div className="space-y-6">
          <section id="thong-tin" className="card rounded-[1.5rem] p-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Thông tin cơ bản</h2>
              <p className="mt-1 text-sm text-slate-500">
                Những thông tin này giúp nhận diện tài khoản và hồ sơ học sinh rõ hơn.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Họ và tên</label>
                <input
                  className="input"
                  value={form.name}
                  disabled={!editable}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Độ tuổi</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={form.age}
                  disabled={!editable}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, age: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Giới tính</label>
                <input
                  className="input"
                  value={form.gender}
                  disabled={!editable}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, gender: event.target.value }))
                  }
                  placeholder="Nam / Nữ / Khác"
                />
              </div>
            </div>
          </section>

          <section id="hoc-tap" className="card rounded-[1.5rem] p-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Thông tin học tập</h2>
              <p className="mt-1 text-sm text-slate-500">
                Nhóm thông tin phục vụ phân lớp, nhận diện trường và bối cảnh học tập.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Lớp / Khối</label>
                <input
                  className="input"
                  value={form.gradeLevel}
                  disabled={!editable}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, gradeLevel: event.target.value }))
                  }
                  placeholder="Ví dụ: 10A1"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Trường</label>
                <input
                  className="input"
                  value={form.school}
                  disabled={!editable}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, school: event.target.value }))
                  }
                  placeholder="Tên trường đang theo học"
                />
              </div>
            </div>
          </section>

          <section id="lien-he" className="card rounded-[1.5rem] p-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Liên hệ</h2>
              <p className="mt-1 text-sm text-slate-500">
                Email hệ thống là cố định, còn số điện thoại có thể cập nhật khi cần.
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Số điện thoại</label>
                <input
                  className="input"
                  value={form.phone}
                  disabled={!editable}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="Có thể để trống"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <input className="input bg-slate-50" value={user.email} disabled />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="card rounded-[1.5rem] p-5">
            <h2 className="text-lg font-bold text-slate-900">Trạng thái tài khoản</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-500">Vai trò hiện tại</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {user.role === "student" ? "Học sinh" : user.role}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-500">Quyền chỉnh sửa</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {editable ? "Bạn có thể cập nhật hồ sơ này" : "Tài khoản chỉ có quyền xem"}
                </div>
              </div>
            </div>
          </div>

          <div className="card rounded-[1.5rem] p-5">
            <h2 className="text-lg font-bold text-slate-900">Điều hướng nhanh</h2>
            <div className="mt-4 grid gap-3">
              <Link href="/" className="rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-slate-50">
                <div className="font-semibold text-slate-900">Tổng quan học tập</div>
                <p className="mt-1 text-sm text-slate-500">Quay lại để xem tiến độ và bài nộp.</p>
              </Link>
              <Link href="/classrooms" className="rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-slate-50">
                <div className="font-semibold text-slate-900">Danh sách lớp học</div>
                <p className="mt-1 text-sm text-slate-500">Mở nhanh lớp đang theo học và bài tập tương ứng.</p>
              </Link>
            </div>
          </div>

          {editable ? (
            <div className="card rounded-[1.5rem] p-5">
              <button onClick={handleSave} disabled={saving} className="btn btn-success w-full">
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk"></i>
                    Lưu thay đổi
                  </>
                )}
              </button>
              <p className="mt-3 text-sm text-slate-500">
                Lưu sau khi bạn hoàn tất cả ba nhóm thông tin bên trái.
              </p>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Chỉ học sinh mới có thể tự cập nhật hồ sơ.
            </div>
          )}
        </aside>
      </div>
    </StudentPageFrame>
  );
}
