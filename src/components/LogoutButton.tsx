"use client";

import { useState } from "react";

export default function LogoutButton({ className = "btn btn-secondary" }: { className?: string }) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <button onClick={handleLogout} disabled={loggingOut} className={className}>
      <i className="fa-solid fa-right-from-bracket"></i>
      {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
    </button>
  );
}
