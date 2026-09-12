"use client";

import { useState } from "react";
import { Icon } from "@/app/components/Icon";
import type { RevenueSeries } from "@/app/lib/types";

const AXIS_STEPS = [60, 40, 20, 0];

function formatMillions(value: number) {
  return `${Math.round(value / 1_000_000)}M`;
}

/**
 * Monthly revenue. One series, so no legend box — the card title names it.
 * Bars carry 4px rounded data-ends anchored to the baseline and a 2px gap;
 * the grid is recessive; every value is reachable via hover or the table below.
 */
export function RevenueChart({ revenue }: { revenue: RevenueSeries }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = 60_000_000;

  return (
    <section className="rounded-2xl border border-hairline bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-extrabold text-slate-900">
          Monthly Revenue
        </h2>
        <span className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-600">
          Revenue ({revenue.currency})
          <Icon name="keyboard_arrow_down" size={18} className="text-slate-400" />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="tnum text-[22px] font-extrabold text-slate-900">
          {revenue.totalDisplay}
        </span>
        <span className="flex items-center gap-1 text-sm font-bold text-green-600">
          <Icon name="arrow_upward" size={16} />+{revenue.trend.changePct}%
        </span>
      </div>

      {/* Extra top gap leaves room for the tooltip above the tallest bar. */}
      <div className="mt-10 flex gap-3">
        <div className="flex w-10 shrink-0 flex-col justify-between py-1 text-right text-[11px] text-slate-400">
          {AXIS_STEPS.map((step) => (
            <span key={step}>{step === 0 ? "0" : `${step}M`}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Recessive gridlines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {AXIS_STEPS.map((step) => (
              <div key={step} className="h-px w-full bg-slate-100" />
            ))}
          </div>

          <div className="relative flex h-[180px] items-end gap-[2px]">
            {revenue.points.map((point, i) => {
              const pct = (point.value / max) * 100;
              const active = hovered === i;
              return (
                <div
                  key={point.month}
                  className="relative flex h-full flex-1 items-end"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                  role="img"
                  aria-label={`${point.month}: ${revenue.currency} ${point.value.toLocaleString()}`}
                >
                  {/* The tooltip anchors to the bar, not the full-height cell,
                      so it tracks the bar's top instead of the plot's top. */}
                  <div className="relative w-full" style={{ height: `${pct}%` }}>
                    <div
                      className={`h-full w-full rounded-t-[4px] transition-colors ${
                        active ? "bg-blue-700" : "bg-blue-500"
                      }`}
                    />
                    {active && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[11px] font-semibold whitespace-nowrap text-white">
                        <div>{point.month}</div>
                        <div className="tnum">{formatMillions(point.value)}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex gap-[2px]">
            {revenue.points.map((point) => (
              <div
                key={point.month}
                className="flex-1 text-center text-[11px] text-slate-500"
              >
                {point.month}
              </div>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Monthly revenue in {revenue.currency}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {revenue.points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{point.month}</th>
              <td>{point.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
