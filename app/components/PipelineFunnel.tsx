"use client";

import { useState } from "react";
import { Icon } from "@/app/components/Icon";
import type { PipelineStage } from "@/app/lib/types";

/** Ordinal ramp — see the --color-stage-* tokens in globals.css. */
const STAGE_FILLS = [
  "var(--color-stage-1)",
  "var(--color-stage-2)",
  "var(--color-stage-3)",
  "var(--color-stage-4)",
  "var(--color-stage-5)",
];

const VIEW_W = 240;
const VIEW_H = 210;
const GAP = 2;

/**
 * Sales pipeline. Stage is an ordered position, not a category, so the fill is
 * one hue stepped by lightness rather than a rainbow. Segment width is strictly
 * proportional to the stage count — the taper carries the data, not decoration.
 */
export function PipelineFunnel({ stages }: { stages: PipelineStage[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...stages.map((s) => s.count));
  const bandH = VIEW_H / stages.length;
  const widthFor = (count: number) => (count / max) * VIEW_W;

  return (
    <section className="rounded-2xl border border-hairline bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-extrabold text-slate-900">
          Sales Pipeline
        </h2>
        <span className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-600">
          All Teams
          <Icon name="keyboard_arrow_down" size={18} className="text-slate-400" />
        </span>
      </div>

      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-[210px] w-full max-w-[240px] shrink-0"
          role="img"
          aria-label="Funnel of pipeline stages; counts are listed beside it"
        >
          {stages.map((stage, i) => {
            const next = stages[i + 1];
            const topW = widthFor(stage.count);
            const bottomW = next ? widthFor(next.count) : topW;
            const y = i * bandH;
            const h = bandH - GAP;
            const x1 = (VIEW_W - topW) / 2;
            const x2 = (VIEW_W - bottomW) / 2;
            return (
              <polygon
                key={stage.id}
                points={`${x1},${y} ${x1 + topW},${y} ${x2 + bottomW},${y + h} ${x2},${y + h}`}
                fill={STAGE_FILLS[i]}
                opacity={hovered === null || hovered === i ? 1 : 0.45}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>

        <ul className="w-full min-w-0 flex-1">
          {stages.map((stage, i) => (
            <li
              key={stage.id}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center gap-3 rounded-lg px-2 py-[7px] transition-colors ${
                hovered === i ? "bg-slate-50" : ""
              }`}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: STAGE_FILLS[i] }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                {stage.label}
              </span>
              <span className="tnum text-sm font-extrabold text-slate-900">
                {stage.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
