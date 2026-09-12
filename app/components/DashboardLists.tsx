import Link from "next/link";
import { Icon } from "@/app/components/Icon";
import type { Lead, Task, TeamMember } from "@/app/lib/types";

function CardShell({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-hairline bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-extrabold text-slate-900">{title}</h2>
        <Link
          href={href}
          className="text-[13px] font-bold text-blue-600 transition-colors hover:text-blue-700"
        >
          View All
        </Link>
      </div>
      {children}
    </section>
  );
}

export function UpcomingTasks({ tasks }: { tasks: Task[] }) {
  return (
    <CardShell title="Upcoming Tasks" href="/tasks">
      <ul className="divide-y divide-hairline">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3 py-3 first:pt-0">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-slate-300 text-transparent">
              <Icon name="task_alt" size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold text-slate-900">
                {task.title}
              </span>
              <span
                className={`block text-[12.5px] ${
                  task.priority === "urgent"
                    ? "font-semibold text-red-600"
                    : "text-slate-500"
                }`}
              >
                {task.dueLabel}
              </span>
            </span>
            <Icon
              name="chevron_right"
              size={20}
              className="shrink-0 text-slate-300"
            />
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

export function RecentLeads({ leads }: { leads: Lead[] }) {
  return (
    <CardShell title="Recent Leads" href="/leads">
      <ul className="divide-y divide-hairline">
        {leads.map((lead) => (
          <li key={lead.id} className="flex items-center gap-3 py-3 first:pt-0">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[12px] font-extrabold text-blue-700">
              {lead.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-extrabold text-slate-900">
                {lead.name}
              </span>
              <span className="block truncate text-[12.5px] text-slate-500">
                {lead.detail}
              </span>
            </span>
            <span className="shrink-0 text-[11.5px] whitespace-nowrap text-slate-400">
              {lead.receivedLabel}
            </span>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

export function TeamPerformance({ team }: { team: TeamMember[] }) {
  return (
    <CardShell title="Team Performance" href="/reports">
      <ul className="flex flex-col gap-4">
        {team.map((member) => (
          <li key={member.id} className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-extrabold text-slate-600">
              {member.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-extrabold text-slate-900">
                {member.name}
              </span>
              <span className="block truncate text-[12px] text-slate-500">
                {member.role}
              </span>
            </span>
            <span className="flex w-[110px] shrink-0 items-center gap-2">
              <span
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
                role="img"
                aria-label={`${member.attainment}% of target`}
              >
                <span
                  className="block h-full rounded-full bg-blue-600"
                  style={{ width: `${member.attainment}%` }}
                />
              </span>
              <span className="tnum text-[12.5px] font-bold text-slate-700">
                {member.attainment}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}
