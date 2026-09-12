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

export default async function DashboardPage() {
  const data = await getDashboard();

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.6px] sm:text-[30px]">
            Good Morning, {data.user.firstName}! <span aria-hidden="true">👋</span>
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
    </div>
  );
}
