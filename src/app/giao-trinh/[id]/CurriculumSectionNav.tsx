"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface NavItem {
  href: string;
  label: string;
}

// Sticky in-page nav for the curriculum detail page. Highlights the section currently
// in view (scroll-spy) and smooth-scrolls to a section on click, respecting the sticky
// header offset via each section's scroll-margin.
export default function CurriculumSectionNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.href ?? "");

  useEffect(() => {
    const ids = items.map((item) => item.href.slice(1));

    const computeActive = () => {
      // Trigger line a little below the sticky header + nav (~110px tall).
      const triggerLine = 140;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= triggerLine) {
          current = id;
        }
      }
      // Force the last item active once scrolled to the very bottom (a short final
      // section may never cross the trigger line on its own).
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = ids[ids.length - 1] ?? current;

      setActive(current ? `#${current}` : "");
    };

    computeActive();
    window.addEventListener("scroll", computeActive, { passive: true });
    window.addEventListener("resize", computeActive);
    return () => {
      window.removeEventListener("scroll", computeActive);
      window.removeEventListener("resize", computeActive);
    };
  }, [items]);

  const handleClick = (href: string) => (event: React.MouseEvent) => {
    const el = document.getElementById(href.slice(1));
    if (!el) return;
    event.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", href);
    setActive(href);
  };

  return (
    <nav className="sticky top-14 z-40 border-b border-slate-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2">
          {items.map((item) => {
            const isActive = active === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={handleClick(item.href)}
                aria-current={isActive ? "true" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>
        <Link
          href="/register"
          className="hidden shrink-0 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 sm:inline-flex"
        >
          Đăng ký
        </Link>
      </div>
    </nav>
  );
}
