"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/app/components/Icon";
import { StatCards } from "@/app/components/StatCards";
import { PipelineFunnel } from "@/app/components/PipelineFunnel";
import { RevenueChart } from "@/app/components/RevenueChart";
import {
  RecentLeads,
  TeamPerformance,
  UpcomingTasks,
} from "@/app/components/DashboardLists";
import { getDashboard } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth";
import type { DashboardData } from "@/app/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getDashboard()
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch(() => {
        if (active) {
          setError(
            "Could not load your dashboard. Check that the API is running.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <div
          role="alert"
          className="rounded-2xl border border-hairline bg-white px-6 py-10 text-center"
        >
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Icon name="close" size={24} />
          </div>
          <p className="mt-3 text-[15px] font-extrabold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.6px] sm:text-[30px]">
            Good Morning, {data?.user.firstName ?? user?.firstName}!{" "}
            <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-[14.5px] text-slate-500">
            Here&rsquo;s what&rsquo;s happening with your CRM today.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-slate-700 transition-colors hover:border-slate-300"
        >
          <Icon name="calendar_month" size={18} className="text-slate-400" />
          This Month
          <Icon name="keyboard_arrow_down" size={18} className="text-slate-400" />
        </button>
      </div>

      {data ? (
        <>
          <StatCards stats={data.stats} />
          <div className="grid gap-5 xl:grid-cols-2">
            <PipelineFunnel stages={data.pipeline} />
            <RevenueChart revenue={data.revenue} />
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <UpcomingTasks tasks={data.tasks} />
            <RecentLeads leads={data.recentLeads} />
            <TeamPerformance team={data.team} />
          </div>
        </>
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  );
}

/** Mirrors the real layout so the page does not jump when data lands. */
function DashboardSkeleton() {
  const block = "animate-pulse rounded-2xl border border-hairline bg-white";
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`${block} h-[148px]`} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className={`${block} h-[340px]`} />
        <div className={`${block} h-[340px]`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={`${block} h-[260px]`} />
        ))}
      </div>
    </>
  );
}
