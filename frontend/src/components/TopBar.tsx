"use client";

import Link from "next/link";

export default function TopBar() {
  return (
    <header
      className="h-[62px] flex items-center justify-between px-5 shrink-0"
      style={{ background: "var(--color-card)", boxShadow: "0 1px 0 #eee" }}
    >
      <Link
        href="/"
        className="text-xl font-extrabold tracking-tight"
        style={{ color: "var(--color-accent)" }}
      >
        Want <span style={{ color: "var(--color-text)" }}>Cooking</span>
      </Link>

      <div className="flex gap-3">
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center transition"
          style={{ background: "#f5f0eb" }}
        >
          <svg className="w-[18px] h-[18px] fill-[#555]" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </button>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center transition"
          style={{ background: "#f5f0eb" }}
        >
          <svg className="w-[18px] h-[18px] fill-[#555]" viewBox="0 0 24 24">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
