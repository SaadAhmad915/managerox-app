import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/app/components/Sidebar";
import { Topbar } from "@/app/components/Topbar";
import { MobileNav } from "@/app/components/MobileNav";
import { getDashboard } from "@/app/lib/api";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ManagerOX CRM",
  description: "Manage leads, contacts, deals and tasks in one place.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Until auth lands, the signed-in user comes from the same mock source.
  const { user } = await getDashboard();

  return (
    <html lang="en" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full bg-canvas font-sans text-slate-900 antialiased">
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar user={user} />
            <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
            <MobileNav />
          </div>
        </div>
      </body>
    </html>
  );
}
