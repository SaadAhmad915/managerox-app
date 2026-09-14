"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/app/components/Dialog";
import {
  Avatar,
  ErrorPanel,
  FilterBar,
  PageHeader,
  Pagination,
  ResourceCard,
  RowButton,
  formatValue,
} from "@/app/components/ResourceShell";
import {
  ApiError,
  createContact,
  deleteContact,
  getContacts,
  updateContact,
  type ContactRecord,
} from "@/app/lib/api";
import { useResourceList } from "@/app/lib/useResourceList";

export default function ContactsPage() {
  const list = useResourceList(
    ({ search, page }) => getContacts({ search, page }),
    [],
    "Could not load contacts. Is the API running?",
  );

  const [editing, setEditing] = useState<ContactRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ContactRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const contacts = list.data?.data ?? [];
  const meta = list.data?.meta;

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteContact(deleting.id);
      setDeleting(null);
      list.reload();
    } catch {
      list.setError("Could not delete that contact.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <PageHeader
        title="Contacts"
        subtitle={
          meta
            ? `${meta.total.toLocaleString()} ${meta.total === 1 ? "person" : "people"}`
            : "Loading your contacts…"
        }
        actionLabel="New contact"
        onAction={() => setCreating(true)}
      />

      <FilterBar
        search={list.search}
        onSearch={list.setSearch}
        placeholder="Search by name, company or email…"
      />

      {list.error ? (
        <ErrorPanel message={list.error} />
      ) : (
        <ResourceCard
          loading={list.loading}
          isEmpty={contacts.length === 0}
          emptyIcon="person"
          emptyTitle="No contacts match this view"
          emptyHint={
            list.search
              ? "Try clearing the search."
              : "Convert a lead, or add someone directly."
          }
        >
          <table className="hidden w-full md:table">
            <thead>
              <tr className="border-b border-hairline text-left text-[12px] font-bold tracking-[0.3px] text-slate-500 uppercase">
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3 text-right">Open deals</th>
                <th className="px-5 py-3 text-right">Won</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-hairline last:border-0"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar initials={contact.initials} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-extrabold text-slate-900">
                          {contact.name}
                        </span>
                        <span className="block truncate text-[12.5px] text-slate-500">
                          {contact.email ?? contact.phone ?? "—"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-slate-700">
                    {contact.company ?? "—"}
                  </td>
                  <td className="tnum px-5 py-3 text-right text-[13.5px] font-bold text-slate-900">
                    {contact.openDeals}
                  </td>
                  <td className="tnum px-5 py-3 text-right text-[13.5px] font-bold text-slate-900">
                    {contact.wonValue ? formatValue(contact.wonValue) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <RowButton
                        icon="edit"
                        label={`Edit ${contact.name}`}
                        onClick={() => setEditing(contact)}
                      />
                      <RowButton
                        icon="delete"
                        tone="danger"
                        label={`Delete ${contact.name}`}
                        onClick={() => setDeleting(contact)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="md:hidden">
            {contacts.map((contact) => (
              <li
                key={contact.id}
                className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-0"
              >
                <Avatar initials={contact.initials} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-extrabold text-slate-900">
                    {contact.name}
                  </span>
                  <span className="block truncate text-[12.5px] text-slate-500">
                    {contact.company ?? contact.email ?? "—"}
                    {contact.openDeals > 0 && ` · ${contact.openDeals} open`}
                  </span>
                </span>
                <RowButton
                  icon="edit"
                  label={`Edit ${contact.name}`}
                  onClick={() => setEditing(contact)}
                />
                <RowButton
                  icon="delete"
                  tone="danger"
                  label={`Delete ${contact.name}`}
                  onClick={() => setDeleting(contact)}
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
        <ContactDialog
          contact={editing}
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
          title="Delete this contact?"
          description={`${deleting.name} will be removed permanently. Their deals are kept but lose the link.`}
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
              {deleteBusy ? "Deleting…" : "Delete contact"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

const field =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-100";
const label = "text-[13px] font-bold text-slate-700";

function ContactDialog({
  contact,
  onClose,
  onSaved,
}: {
  contact: ContactRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: contact?.name ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    company: contact?.company ?? "",
    notes: contact?.notes ?? "",
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
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (contact) await updateContact(contact.id, payload);
      else await createContact(payload);
      onSaved();
    } catch (caught) {
      setError(caught as Error);
      setSaving(false);
    }
  }

  return (
    <Dialog
      title={contact ? "Edit contact" : "New contact"}
      description={contact ? `Updating ${contact.name}` : "Add someone to your directory."}
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
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={field}
            placeholder="Hina Raza"
          />
          {fieldError("name") && (
            <span className="mt-1 block text-[12px] font-semibold text-red-600">
              {fieldError("name")}
            </span>
          )}
        </label>

        <label className="mt-4 block">
          <span className={label}>Company</span>
          <input
            name="company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className={field}
            placeholder="Zameen Group"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={field}
              placeholder="optional"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className={label}>Notes</span>
          <textarea
            name="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={field}
            placeholder="Anything worth remembering"
          />
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
            {saving ? "Saving…" : contact ? "Save changes" : "Create contact"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
