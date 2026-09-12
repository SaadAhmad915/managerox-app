"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/app/components/Icon";
import { NAV_ITEMS } from "@/app/lib/nav";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-4">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              active
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon name={item.icon} size={22} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function UpgradeCard() {
  return (
    <div className="mx-4 mt-auto mb-6 rounded-2xl bg-slate-50 p-5">
      <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
        <Icon name="bolt" size={22} />
      </div>
      <div className="mt-3 text-[15px] font-extrabold text-slate-900">
        Upgrade to Pro
      </div>
      <p className="mt-1 text-[13px] leading-[1.5] text-slate-500">
        Unlock more features and grow faster.
      </p>
      <Link
        href="/settings"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-blue-700"
      >
        Upgrade Now
        <Icon name="chevron_right" size={18} />
      </Link>
    </div>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="block px-8 py-6 text-[22px] font-extrabold tracking-[-0.5px]">
      Manager<span className="text-blue-600">OX</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-[264px] shrink-0 flex-col border-r border-hairline bg-white lg:flex">
      <Wordmark />
      <SidebarNav />
      <UpgradeCard />
    </aside>
  );
}
