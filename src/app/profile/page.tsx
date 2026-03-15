"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    gradeLevel: "",
    school: "",
    phone: "",
  });

  useEffect(() => {
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
      } catch (error) {
        alert("Không th? t?i h? so");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

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
        alert(data.error || "Không th? c?p nh?t h? so");
        return;
      }

      alert("C?p nh?t h? so thành công");
    } catch (error) {
      alert("Ðã x?y ra l?i");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const editable = user.role === "student";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">H? so cá nhân</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">H? và tên</label>
            <input
              className="input"
              value={form.name}
              disabled={!editable}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ð? tu?i</label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.age}
                disabled={!editable}
                onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gi?i tính</label>
              <input
                className="input"
                value={form.gender}
                disabled={!editable}
                onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
                placeholder="Nam / N? / Khác"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">L?p / Kh?i</label>
              <input
                className="input"
                value={form.gradeLevel}
                disabled={!editable}
                onChange={(e) => setForm((prev) => ({ ...prev, gradeLevel: e.target.value }))}
                placeholder="Ví d?: 10A1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tru?ng</label>
              <input
                className="input"
                value={form.school}
                disabled={!editable}
                onChange={(e) => setForm((prev) => ({ ...prev, school: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">S? di?n tho?i</label>
            <input
              className="input"
              value={form.phone}
              disabled={!editable}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Có th? d? tr?ng"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input bg-gray-50" value={user.email} disabled />
          </div>

          {editable ? (
            <div className="pt-2 flex justify-end">
              <button onClick={handleSave} disabled={saving} className="btn btn-success">
                {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Ðang luu...</> : <><i className="fa-solid fa-save"></i> Luu h? so</>}
              </button>
            </div>
          ) : (
            <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
              Ch? h?c sinh có th? t? c?p nh?t h? so.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

