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

  /*
   * The escape hatch below is a plain link, on purpose.
   *
   * This spinner is server-rendered HTML. If the client bundle fails to load,
   * React never hydrates, the effect above never runs, and no client-side
   * timeout would ever fire — the page would spin for ever with no way out.
   * A link needs no JavaScript, and a CSS delay reveals it for the same reason.
   */
  if (loading || !user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
        <span className="sr-only">Loading</span>
        <span className="size-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />

        <div className="reveal-late max-w-sm text-center">
          <p className="text-[13.5px] text-slate-500">
            This is taking longer than it should.
          </p>
          <a
            href="/login"
            className="mt-2 inline-block text-[13.5px] font-bold text-blue-600 underline"
          >
            Go to sign in
          </a>
          <p className="mt-3 text-[12.5px] text-slate-400">
            If that does not load either, the app is not being served from{" "}
            <code className="font-semibold">localhost</code>. Check the URL the
            dev server printed, then run{" "}
            <code className="font-semibold">npm run doctor</code>.
          </p>
        </div>
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
