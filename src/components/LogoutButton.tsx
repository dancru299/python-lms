"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="btn btn-secondary text-sm"
    >
      <i className="fa-solid fa-right-from-bracket"></i>
      Đăng xuất
    </button>
  );
}
