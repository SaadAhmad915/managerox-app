"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/app/components/Sidebar";
import { Topbar } from "@/app/components/Topbar";
import { MobileNav } from "@/app/components/MobileNav";
import { useAuth } from "@/app/lib/auth";

/**
 * Shell for every signed-in page. Anyone without a session is sent to /login
 * before any of it renders, so the chrome never flashes for a signed-out user.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="sr-only">Loading</span>
        <span className="size-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
