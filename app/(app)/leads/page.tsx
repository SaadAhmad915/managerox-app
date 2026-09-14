"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/app/components/Icon";
import { Dialog } from "@/app/components/Dialog";
import { LeadDialog } from "@/app/components/LeadDialog";
import {
  ApiError,
  LEAD_STATUSES,
  convertLead,
  deleteLead,
  getLeads,
  type LeadRecord,
  type Paginated,
} from "@/app/lib/api";

/**
 * Lead statuses are ordinal too — an enquiry moves along them — so they take
 * the same single-hue ramp the deal funnel uses. Unqualified sits outside the
 * progression, so it gets a neutral grey rather than a point on the scale.
 */
const STATUS_DOT: Record<string, string> = {
  new: "bg-stage-1",
  contacted: "bg-stage-2",
  qualified: "bg-stage-3",
  converted: "bg-stage-5",
  unqualified: "bg-slate-300",
};

export default function LeadsPage() {
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  // Bumped after a save or delete to force a refetch of the same query.
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * `loading` is derived rather than stored. Setting it synchronously inside
   * the fetch effect would trigger a cascading render; comparing the key the
   * data was loaded for against the key we currently want says the same thing
   * for free.
   */
  const requestKey = `${status}|${source}|${debouncedSearch}|${page}|${refreshKey}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    data: Paginated<LeadRecord>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = !error && loaded?.key !== requestKey;

  const [editing, setEditing] = useState<LeadRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<LeadRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [converting, setConverting] = useState<LeadRecord | null>(null);

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;

    getLeads({
      status: status || undefined,
      source: source || undefined,
      search: debouncedSearch,
      page,
    })
      .then((data) => {
        if (!active) return;
        setLoaded({ key: requestKey, data });
        setError(null);
      })
      .catch(() => {
        if (active) setError("Could not load leads. Is the API running?");
      });

    return () => {
      active = false;
    };
  }, [requestKey, status, source, debouncedSearch, page]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteLead(deleting.id);
      setDeleting(null);
      reload();
    } catch {
      setError("Could not delete that lead.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const leads = loaded?.data.data ?? [];
  const meta = loaded?.data.meta;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.6px] sm:text-[30px]">
            Leads
          </h1>
          <p className="mt-1 text-[14.5px] text-slate-500">
            {meta
              ? `${meta.total.toLocaleString()} lead${meta.total === 1 ? "" : "s"} in your pipeline`
              : "Loading your pipeline…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-blue-700"
        >
          <Icon name="add" size={18} />
          New lead
        </button>
      </div>

      {/* Filters sit in one row above the table. */}
      <div className="flex flex-wrap gap-3">
        <label className="relative flex min-w-[220px] flex-1 items-center">
          <span className="sr-only">Search leads</span>
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-3.5 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or detail…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm outline-none placeholder:text-slate-400 focus-visible:border-blue-600"
          />
        </label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus-visible:border-blue-600"
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by source"
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus-visible:border-blue-600"
        >
          <option value="">All sources</option>
          <option value="meta">Meta Lead Ads</option>
          <option value="manual">Added manually</option>
        </select>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-hairline bg-white px-6 py-8 text-center text-[14px] font-semibold text-red-600"
        >
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-hairline bg-white">
          <table className="hidden w-full md:table">
            <thead>
              <tr className="border-b border-hairline text-left text-[12px] font-bold tracking-[0.3px] text-slate-500 uppercase">
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Added</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-hairline last:border-0"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[12px] font-extrabold text-blue-700">
                        {lead.initials}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-extrabold text-slate-900">
                            {lead.name}
                          </span>
                          <SourceBadge source={lead.source} />
                        </span>
                        <span className="block truncate text-[12.5px] text-slate-500">
                          {lead.detail || "—"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2 text-[13px] whitespace-nowrap text-slate-700">
                      <span
                        className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[lead.status] ?? "bg-slate-300"}`}
                      />
                      {lead.statusLabel}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[13px] whitespace-nowrap text-slate-700">
                    {lead.owner?.name ?? "Unassigned"}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] whitespace-nowrap text-slate-500">
                    {lead.receivedLabel}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <RowActions
                        name={lead.name}
                        converted={lead.isConverted}
                        onConvert={() => setConverting(lead)}
                        onEdit={() => setEditing(lead)}
                        onDelete={() => setDeleting(lead)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="md:hidden">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-0"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[12px] font-extrabold text-blue-700">
                  {lead.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-extrabold text-slate-900">
                      {lead.name}
                    </span>
                    <SourceBadge source={lead.source} />
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-slate-500">
                    <span
                      className={`size-2 shrink-0 rounded-full ${STATUS_DOT[lead.status] ?? "bg-slate-300"}`}
                    />
                    {lead.statusLabel}
                    {lead.owner && ` · ${lead.owner.name}`}
                  </span>
                </span>
                <RowActions
                  name={lead.name}
                  converted={lead.isConverted}
                  onConvert={() => setConverting(lead)}
                  onEdit={() => setEditing(lead)}
                  onDelete={() => setDeleting(lead)}
                />
              </li>
            ))}
          </ul>

          {loading && (
            <div className="px-5 py-10 text-center text-[13.5px] text-slate-500">
              Loading…
            </div>
          )}

          {!loading && leads.length === 0 && (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Icon name="group" size={24} />
              </div>
              <p className="mt-3 text-[15px] font-extrabold text-slate-900">
                No leads match this view
              </p>
              <p className="mt-1 text-[13.5px] text-slate-500">
                {search || status
                  ? "Try clearing the search or stage filter."
                  : "Create your first lead to get started."}
              </p>
            </div>
          )}
        </div>
      )}

      {meta && meta.lastPage > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-[13px] text-slate-500">
            Page {meta.page.toLocaleString()} of {meta.lastPage.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={meta.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-bold text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={meta.page >= meta.lastPage || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-bold text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {(creating || editing) && (
        <LeadDialog
          lead={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            reload();
          }}
        />
      )}

      {converting && (
        <ConvertDialog
          lead={converting}
          onClose={() => setConverting(null)}
          onConverted={() => {
            setConverting(null);
            reload();
          }}
        />
      )}

      {deleting && (
        <Dialog
          title="Delete this lead?"
          description={`${deleting.name} will be removed permanently. This cannot be undone.`}
          onClose={() => setDeleting(null)}
        >
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleteBusy}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {deleteBusy ? "Deleting…" : "Delete lead"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

/** Marks leads that arrived from an integration rather than being typed in. */
function SourceBadge({ source }: { source: string }) {
  if (source !== "meta") return null;

  return (
    <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.3px] text-blue-700 uppercase">
      Meta
    </span>
  );
}

function RowActions({
  name,
  converted,
  onConvert,
  onEdit,
  onDelete,
}: {
  name: string;
  converted: boolean;
  onConvert: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      {!converted && (
        <button
          type="button"
          onClick={onConvert}
          aria-label={`Convert ${name}`}
          title="Convert to contact and deal"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
        >
          <Icon name="trending_up" size={18} />
        </button>
      )}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${name}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
      >
        <Icon name="edit" size={18} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${name}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <Icon name="delete" size={18} />
      </button>
    </>
  );
}


/**
 * Converting creates the person and their first opportunity. It happens once —
 * a second attempt is refused by the API rather than quietly duplicating both.
 */
function ConvertDialog({
  lead,
  onClose,
  onConverted,
}: {
  lead: LeadRecord;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [title, setTitle] = useState(lead.detail || lead.name);
  const [value, setValue] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await convertLead(lead.id, {
        title: title.trim() || undefined,
        value: Number(value) || 0,
      });
      onConverted();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Could not convert this lead.",
      );
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-100";

  return (
    <Dialog
      title="Convert this lead"
      description={`Creates a contact for ${lead.name} and their first deal.`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-50 px-3.5 py-3 text-[13px] font-semibold text-red-600"
          >
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-[13px] font-bold text-slate-700">Deal title</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-[13px] font-bold text-slate-700">
            Deal value (PKR)
          </span>
          <input
            name="value"
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClass}
          />
        </label>

        <p className="mt-3 text-[12px] text-slate-500">
          The deal starts at the Qualified stage. The lead is kept as the record
          of where this business came from.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Converting…" : "Convert lead"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
