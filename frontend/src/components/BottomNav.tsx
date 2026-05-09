"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "ホーム",
    icon: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  },
  {
    href: "/search",
    label: "検索",
    icon: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  },
  {
    href: "/favorites",
    label: "お気に入り",
    icon: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  },
  {
    href: "/settings",
    label: "設定",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-20 flex items-center justify-around pb-4"
      style={{
        background: "var(--color-card)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 px-4 py-1"
          >
            <svg
              className="w-[22px] h-[22px]"
              viewBox="0 0 24 24"
              fill={isActive ? "var(--color-accent)" : "#bbb"}
            >
              <path d={item.icon} />
            </svg>
            <span
              className="text-[10px] font-semibold"
              style={{ color: isActive ? "var(--color-accent)" : "#bbb" }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
