"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "@/app/components/Icon";

/** Page header with a title, a subtitle and one primary action. */
export function PageHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.6px] sm:text-[30px]">
          {title}
        </h1>
        <p className="mt-1 text-[14.5px] text-slate-500">{subtitle}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-blue-700"
        >
          <Icon name="add" size={18} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** Filter row: a search box plus whatever selects the screen needs. */
export function FilterBar({
  search,
  onSearch,
  placeholder,
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <label className="relative flex min-w-[220px] flex-1 items-center">
        <span className="sr-only">Search</span>
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute left-3.5 text-slate-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm outline-none placeholder:text-slate-400 focus-visible:border-blue-600"
        />
      </label>
      {children}
    </div>
  );
}

export function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus-visible:border-blue-600"
    >
      {children}
    </select>
  );
}

/** Card that holds a table or list, with loading and empty states. */
export function ResourceCard({
  loading,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyHint,
  children,
}: {
  loading: boolean;
  isEmpty: boolean;
  emptyIcon: IconName;
  emptyTitle: string;
  emptyHint: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-white">
      {children}

      {loading && (
        <div className="px-5 py-10 text-center text-[13.5px] text-slate-500">
          Loading…
        </div>
      )}

      {!loading && isEmpty && (
        <div className="px-5 py-14 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Icon name={emptyIcon} size={24} />
          </div>
          <p className="mt-3 text-[15px] font-extrabold text-slate-900">
            {emptyTitle}
          </p>
          <p className="mt-1 text-[13.5px] text-slate-500">{emptyHint}</p>
        </div>
      )}
    </div>
  );
}

export function Pagination({
  page,
  lastPage,
  loading,
  onChange,
}: {
  page: number;
  lastPage: number;
  loading: boolean;
  onChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <span className="text-[13px] text-slate-500">
        Page {page.toLocaleString()} of {lastPage.toLocaleString()}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onChange(Math.max(1, page - 1))}
          className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-bold text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= lastPage || loading}
          onClick={() => onChange(page + 1)}
          className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-bold text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-hairline bg-white px-6 py-8 text-center text-[14px] font-semibold text-red-600"
    >
      {message}
    </div>
  );
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[12px] font-extrabold text-blue-700">
      {initials}
    </span>
  );
}

export function RowButton({
  icon,
  label,
  tone = "neutral",
  onClick,
}: {
  icon: IconName;
  label: string;
  tone?: "neutral" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors ${
        tone === "danger"
          ? "hover:bg-red-50 hover:text-red-600"
          : "hover:bg-slate-100 hover:text-blue-600"
      }`}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

/** 5_000_000 -> "5.0M" */
export function formatValue(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}
