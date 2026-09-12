import { Icon, type IconName } from "@/app/components/Icon";
import type { Stat, StatKey } from "@/app/lib/types";

const TILE: Record<StatKey, { icon: IconName; tint: string; ink: string }> = {
  leads: { icon: "group", tint: "bg-blue-100", ink: "text-blue-600" },
  deals: { icon: "work", tint: "bg-green-100", ink: "text-green-600" },
  customers: { icon: "person", tint: "bg-violet-100", ink: "text-violet-600" },
  revenue: { icon: "payments", tint: "bg-orange-100", ink: "text-orange-600" },
};

/**
 * Four headline numbers. These are stat tiles, not charts — a single value with
 * a comparison reads faster as a number than as any plot.
 */
export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const tile = TILE[stat.key];
        const up = stat.trend.changePct >= 0;
        return (
          <article
            key={stat.key}
            className="rounded-2xl border border-hairline bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tile.tint} ${tile.ink}`}
              >
                <Icon name={tile.icon} size={22} />
              </div>
              <Icon name="more_horiz" size={20} className="text-slate-300" />
            </div>
            <div className="mt-3 text-[13.5px] font-semibold text-slate-500">
              {stat.label}
            </div>
            <div className="tnum mt-0.5 text-[28px] leading-tight font-extrabold text-slate-900">
              {stat.display}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[13px]">
              <span
                className={`flex items-center gap-0.5 font-bold ${
                  up ? "text-green-600" : "text-red-600"
                }`}
              >
                <Icon
                  name="arrow_upward"
                  size={15}
                  className={up ? "" : "rotate-180"}
                />
                {up ? "+" : ""}
                {stat.trend.changePct}%
              </span>
              <span className="text-slate-400">
                {stat.trend.comparisonLabel}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
