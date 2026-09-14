"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/app/components/Dialog";
import {
  ErrorPanel,
  FilterBar,
  PageHeader,
  Pagination,
  ResourceCard,
  RowButton,
  Select,
  formatValue,
} from "@/app/components/ResourceShell";
import {
  ApiError,
  DEAL_STAGES,
  createDeal,
  deleteDeal,
  getDeals,
  updateDeal,
  type DealRecord,
} from "@/app/lib/api";
import { useResourceList } from "@/app/lib/useResourceList";

/** Same ordinal ramp as the dashboard funnel, so a stage reads alike everywhere. */
const STAGE_DOT: Record<string, string> = {
  new: "bg-stage-1",
  qualified: "bg-stage-2",
  proposal: "bg-stage-3",
  negotiation: "bg-stage-4",
  closed: "bg-stage-5",
};

export default function DealsPage() {
  const [stage, setStage] = useState("");
  const [includeLost, setIncludeLost] = useState(false);

  const list = useResourceList(
    ({ search, page }) =>
      getDeals({ stage: stage || undefined, includeLost, search, page }),
    [stage, includeLost],
    "Could not load deals. Is the API running?",
  );

  const [editing, setEditing] = useState<DealRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<DealRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const deals = list.data?.data ?? [];
  const meta = list.data?.meta;
  const summary = list.data?.summary;

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteDeal(deleting.id);
      setDeleting(null);
      list.reload();
    } catch {
      list.setError("Could not delete that deal.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <PageHeader
        title="Deals"
        subtitle={
          meta
            ? `${meta.total.toLocaleString()} ${meta.total === 1 ? "deal" : "deals"} in view`
            : "Loading your pipeline…"
        }
        actionLabel="New deal"
        onAction={() => setCreating(true)}
      />

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryTile label="Open pipeline value" value={summary.openValue} />
          <SummaryTile label="Won this month" value={summary.wonValueThisMonth} />
        </div>
      )}

      <FilterBar
        search={list.search}
        onSearch={list.setSearch}
        placeholder="Search deals by title…"
      >
        <Select value={stage} onChange={setStage} label="Filter by stage">
          <option value="">All stages</option>
          {DEAL_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select
          value={includeLost ? "1" : ""}
          onChange={(v) => setIncludeLost(v === "1")}
          label="Include lost deals"
        >
          <option value="">Hide lost</option>
          <option value="1">Include lost</option>
        </Select>
      </FilterBar>

      {list.error ? (
        <ErrorPanel message={list.error} />
      ) : (
        <ResourceCard
          loading={list.loading}
          isEmpty={deals.length === 0}
          emptyIcon="work"
          emptyTitle="No deals match this view"
          emptyHint={
            list.search || stage
              ? "Try clearing the search or stage filter."
              : "Convert a qualified lead, or create a deal directly."
          }
        >
          <table className="hidden w-full md:table">
            <thead>
              <tr className="border-b border-hairline text-left text-[12px] font-bold tracking-[0.3px] text-slate-500 uppercase">
                <th className="px-5 py-3">Deal</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3 text-right">Value</th>
                <th className="px-5 py-3">Added</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-3">
                    <span className="block truncate text-[13.5px] font-extrabold text-slate-900">
                      {deal.title}
                    </span>
                    <span className="block truncate text-[12.5px] text-slate-500">
                      {deal.contact?.name ?? "No contact linked"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StageLabel deal={deal} />
                  </td>
                  <td className="tnum px-5 py-3 text-right text-[13.5px] font-bold text-slate-900">
                    {deal.value ? formatValue(deal.value) : "—"}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] whitespace-nowrap text-slate-500">
                    {deal.addedLabel}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <RowButton
                        icon="edit"
                        label={`Edit ${deal.title}`}
                        onClick={() => setEditing(deal)}
                      />
                      <RowButton
                        icon="delete"
                        tone="danger"
                        label={`Delete ${deal.title}`}
                        onClick={() => setDeleting(deal)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="md:hidden">
            {deals.map((deal) => (
              <li
                key={deal.id}
                className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-extrabold text-slate-900">
                    {deal.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-slate-500">
                    <StageLabel deal={deal} />
                    {deal.value > 0 && ` · ${formatValue(deal.value)}`}
                  </span>
                </span>
                <RowButton
                  icon="edit"
                  label={`Edit ${deal.title}`}
                  onClick={() => setEditing(deal)}
                />
                <RowButton
                  icon="delete"
                  tone="danger"
                  label={`Delete ${deal.title}`}
                  onClick={() => setDeleting(deal)}
                />
              </li>
            ))}
          </ul>
        </ResourceCard>
      )}

      {meta && (
        <Pagination
          page={meta.page}
          lastPage={meta.lastPage}
          loading={list.loading}
          onChange={list.setPage}
        />
      )}

      {(creating || editing) && (
        <DealDialog
          deal={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            list.reload();
          }}
        />
      )}

      {deleting && (
        <Dialog
          title="Delete this deal?"
          description={`${deleting.title} will be removed permanently. Marking it lost keeps the history instead.`}
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
              {deleteBusy ? "Deleting…" : "Delete deal"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-5">
      <div className="text-[13px] font-semibold text-slate-500">{label}</div>
      <div className="tnum mt-1 text-[24px] font-extrabold text-slate-900">
        PKR {value.toLocaleString()}
      </div>
    </div>
  );
}

function StageLabel({ deal }: { deal: DealRecord }) {
  return (
    <span className="flex items-center gap-2 text-[13px] whitespace-nowrap text-slate-700">
      <span
        className={`size-2.5 shrink-0 rounded-full ${
          deal.isLost ? "bg-slate-300" : (STAGE_DOT[deal.stage] ?? "bg-slate-300")
        }`}
      />
      {deal.isLost ? "Lost" : deal.stageLabel}
    </span>
  );
}

const field =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-100";
const label = "text-[13px] font-bold text-slate-700";

function DealDialog({
  deal,
  onClose,
  onSaved,
}: {
  deal: DealRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: deal?.title ?? "",
    stage: deal?.stage ?? "new",
    value: deal ? String(deal.value) : "0",
    expected: deal?.expectedCloseOn ?? "",
    lost: deal?.isLost ?? false,
  });
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  const fieldError = (name: string) =>
    error instanceof ApiError ? error.fieldError(name) : undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      stage: form.stage,
      value: Number(form.value) || 0,
      expected_close_on: form.expected || null,
      lost: form.lost,
    };

    try {
      if (deal) await updateDeal(deal.id, payload);
      else await createDeal(payload);
      onSaved();
    } catch (caught) {
      setError(caught as Error);
      setSaving(false);
    }
  }

  return (
    <Dialog
      title={deal ? "Edit deal" : "New deal"}
      description={deal ? `Updating ${deal.title}` : "Add an opportunity to your pipeline."}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        {error && !(error instanceof ApiError && error.status === 422) && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-50 px-3.5 py-3 text-[13px] font-semibold text-red-600"
          >
            {error.message}
          </div>
        )}

        <label className="block">
          <span className={label}>Title</span>
          <input
            name="title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={field}
            placeholder="Villa – DHA Islamabad"
          />
          {fieldError("title") && (
            <span className="mt-1 block text-[12px] font-semibold text-red-600">
              {fieldError("title")}
            </span>
          )}
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Stage</span>
            <select
              name="stage"
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
              className={field}
            >
              {DEAL_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Value (PKR)</span>
            <input
              name="value"
              type="number"
              min={0}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className={field}
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className={label}>Expected close</span>
          <input
            name="expected_close_on"
            type="date"
            value={form.expected}
            onChange={(e) => setForm({ ...form, expected: e.target.value })}
            className={field}
          />
        </label>

        <label className="mt-4 flex items-center gap-2.5">
          <input
            type="checkbox"
            name="lost"
            checked={form.lost}
            onChange={(e) => setForm({ ...form, lost: e.target.checked })}
            className="size-4 rounded border-slate-300"
          />
          <span className="text-[13px] font-semibold text-slate-700">
            Mark as lost
          </span>
        </label>
        <p className="mt-1 text-[12px] text-slate-500">
          A lost deal keeps its history but leaves the pipeline and never counts
          as revenue.
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
            {saving ? "Saving…" : deal ? "Save changes" : "Create deal"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
