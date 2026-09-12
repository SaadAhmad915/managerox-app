"use client";

import { useState } from "react";
import { Icon } from "@/app/components/Icon";
import { SidebarNav, UpgradeCard, Wordmark } from "@/app/components/Sidebar";

export function Topbar({
  user,
}: {
  user: { fullName: string; role: string };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-hairline bg-white px-4 py-3 sm:gap-4 sm:px-6">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
        >
          <Icon name="menu" size={24} />
        </button>

        <label className="relative flex min-w-0 flex-1 items-center">
          <span className="sr-only">Search</span>
          <Icon
            name="search"
            size={20}
            className="pointer-events-none absolute left-4 text-slate-400"
          />
          <input
            type="search"
            placeholder="Search leads, contacts, deals, or anything..."
            className="w-full rounded-xl bg-slate-50 py-3 pr-4 pl-12 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600"
          />
        </label>

        <button
          type="button"
          aria-label="Notifications — 1 unread"
          className="relative flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
        >
          <Icon name="notifications" size={22} />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-red-500" />
        </button>

        <div className="flex shrink-0 items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-[13px] font-extrabold text-blue-700">
            {initials}
          </div>
          <div className="hidden sm:block">
            <div className="text-[13.5px] leading-tight font-extrabold text-slate-900">
              {user.fullName}
            </div>
            <div className="text-[12px] leading-tight text-slate-500">
              {user.role}
            </div>
          </div>
          <Icon
            name="keyboard_arrow_down"
            size={20}
            className="hidden text-slate-400 sm:block"
          />
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-[264px] flex-col bg-white">
            <div className="flex items-center justify-between pr-4">
              <Wordmark />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex size-10 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100"
              >
                <Icon name="close" size={24} />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
            <UpgradeCard />
          </div>
        </div>
      )}
    </>
  );
}
