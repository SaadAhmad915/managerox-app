"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/app/components/Dialog";
import {
  ApiError,
  LEAD_STATUSES,
  createLead,
  updateLead,
  type LeadRecord,
} from "@/app/lib/api";

const field =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-100";
const label = "text-[13px] font-bold text-slate-700";

/** Create when `lead` is null, edit otherwise. */
export function LeadDialog({
  lead,
  onClose,
  onSaved,
}: {
  lead: LeadRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: lead?.name ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    detail: lead?.detail ?? "",
    status: lead?.status ?? "new",
  });
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const fieldError = (name: string) =>
    error instanceof ApiError ? error.fieldError(name) : undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      detail: form.detail.trim() || null,
      status: form.status,
    };

    try {
      if (lead) {
        await updateLead(lead.id, payload);
      } else {
        await createLead(payload);
      }
      onSaved();
    } catch (caught) {
      setError(caught as Error);
      setSaving(false);
    }
  }

  return (
    <Dialog
      title={lead ? "Edit lead" : "New lead"}
      description={
        lead ? `Updating ${lead.name}` : "Add a lead to your pipeline."
      }
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
          <span className={label}>Name</span>
          <input
            name="name"
            required
            value={form.name}
            onChange={(e) => set("name")(e.target.value)}
            className={field}
            placeholder="Farhan Ali"
          />
          {fieldError("name") && (
            <span className="mt-1 block text-[12px] font-semibold text-red-600">
              {fieldError("name")}
            </span>
          )}
        </label>

        <label className="mt-4 block">
          <span className={label}>Detail</span>
          <input
            name="detail"
            value={form.detail}
            onChange={(e) => set("detail")(e.target.value)}
            className={field}
            placeholder="Residential Plot – DHA Lahore"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              className={field}
              placeholder="optional"
            />
            {fieldError("email") && (
              <span className="mt-1 block text-[12px] font-semibold text-red-600">
                {fieldError("email")}
              </span>
            )}
          </label>

          <label className="block">
            <span className={label}>Phone</span>
            <input
              name="phone"
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              className={field}
              placeholder="optional"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className={label}>Status</span>
          <select
            name="status"
            value={form.status}
            onChange={(e) => set("status")(e.target.value)}
            className={field}
          >
            {LEAD_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[12px] text-slate-500">
            Value and pipeline stage live on the deal, created when this lead is
            converted.
          </span>
        </label>

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
            {saving ? "Saving…" : lead ? "Save changes" : "Create lead"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
