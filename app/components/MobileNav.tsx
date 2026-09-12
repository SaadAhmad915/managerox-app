"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/app/components/Icon";
import { MOBILE_NAV, type NavItem } from "@/app/lib/nav";

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition-colors ${
        active ? "text-blue-600" : "text-slate-500"
      }`}
    >
      <Icon name={item.icon} size={24} />
      {item.label}
    </Link>
  );
}

/** Phone tab bar, with the "Add" action raised in the centre. */
export function MobileNav() {
  const pathname = usePathname();
  const [first, second, third, fourth] = MOBILE_NAV;
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="sticky bottom-0 z-40 flex items-center border-t border-hairline bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <Tab item={first} active={isActive(first.href)} />
      <Tab item={second} active={isActive(second.href)} />
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          aria-label="Add new record"
          className="-mt-6 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.6)] transition-colors hover:bg-blue-700"
        >
          <Icon name="add" size={28} />
        </button>
      </div>
      <Tab item={third} active={isActive(third.href)} />
      <Tab item={fourth} active={isActive(fourth.href)} />
    </nav>
  );
}
