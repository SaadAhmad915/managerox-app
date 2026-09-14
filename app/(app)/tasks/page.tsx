"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/app/components/Icon";
import { Dialog } from "@/app/components/Dialog";
import {
  ErrorPanel,
  PageHeader,
  Pagination,
  ResourceCard,
  RowButton,
} from "@/app/components/ResourceShell";
import {
  ApiError,
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  type TaskRecord,
} from "@/app/lib/api";
import { useResourceList } from "@/app/lib/useResourceList";

const FILTERS = [
  { value: "open", label: "Open" },
  { value: "today", label: "Today" },
  { value: "overdue", label: "Overdue" },
  { value: "done", label: "Done" },
  { value: "", label: "All" },
] as const;

export default function TasksPage() {
  const [filter, setFilter] = useState<string>("open");

  const list = useResourceList(
    ({ page }) => getTasks({ filter: filter || undefined, page }),
    [filter],
    "Could not load tasks. Is the API running?",
  );

  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<TaskRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const tasks = list.data?.data ?? [];
  const meta = list.data?.meta;
  const counts = list.data?.counts;

  /** Optimistic: the checkbox should feel instant, not wait for a round trip. */
  async function toggle(task: TaskRecord) {
    setBusyId(task.id);
    try {
      await updateTask(task.id, { done: !task.done });
      list.reload();
    } catch {
      list.setError("Could not update that task.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteTask(deleting.id);
      setDeleting(null);
      list.reload();
    } catch {
      list.setError("Could not delete that task.");
    }
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <PageHeader
        title="Tasks"
        subtitle={
          counts
            ? `${counts.open} open · ${counts.today} due today · ${counts.overdue} overdue`
            : "Loading your tasks…"
        }
        actionLabel="New task"
        onAction={() => setCreating(true)}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={`rounded-xl px-4 py-2 text-[13px] font-bold transition-colors ${
              filter === option.value
                ? "bg-blue-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            {option.label}
            {option.value === "overdue" && counts && counts.overdue > 0 && (
              <span className="ml-1.5 text-[12px]">({counts.overdue})</span>
            )}
          </button>
        ))}
      </div>

      {list.error ? (
        <ErrorPanel message={list.error} />
      ) : (
        <ResourceCard
          loading={list.loading}
          isEmpty={tasks.length === 0}
          emptyIcon="task_alt"
          emptyTitle="Nothing here"
          emptyHint={
            filter === "overdue"
              ? "Nothing is overdue — good."
              : "Add a task to keep track of your follow-ups."
          }
        >
          <ul>
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-0 sm:px-5"
              >
                <button
                  type="button"
                  onClick={() => toggle(task)}
                  disabled={busyId === task.id}
                  aria-label={
                    task.done
                      ? `Mark "${task.title}" as not done`
                      : `Mark "${task.title}" as done`
                  }
                  aria-pressed={task.done}
                  className={`flex size-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-colors ${
                    task.done
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 text-transparent hover:border-blue-600"
                  }`}
                >
                  <Icon name="task_alt" size={13} />
                </button>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[13.5px] font-semibold ${
                      task.done
                        ? "text-slate-400 line-through"
                        : "text-slate-900"
                    }`}
                  >
                    {task.title}
                  </span>
                  <span
                    className={`block truncate text-[12.5px] ${
                      task.isOverdue
                        ? "font-semibold text-red-600"
                        : task.priority === "urgent"
                          ? "font-semibold text-red-600"
                          : "text-slate-500"
                    }`}
                  >
                    {task.isOverdue && "Overdue · "}
                    {task.dueLabel}
                    {task.contact && ` · ${task.contact.name}`}
                  </span>
                </span>

                <RowButton
                  icon="delete"
                  tone="danger"
                  label={`Delete ${task.title}`}
                  onClick={() => setDeleting(task)}
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

      {creating && (
        <TaskDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            list.reload();
          }}
        />
      )}

      {deleting && (
        <Dialog
          title="Delete this task?"
          description={`"${deleting.title}" will be removed permanently.`}
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
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
            >
              Delete task
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

function TaskDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  // Defaults to tomorrow morning — a task with no sensible due date is noise.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState(
    new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16),
  );
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await createTask({
        title: title.trim(),
        due_at: new Date(dueAt).toISOString(),
      });
      onSaved();
    } catch (caught) {
      setError(caught as Error);
      setSaving(false);
    }
  }

  const fieldError = (name: string) =>
    error instanceof ApiError ? error.fieldError(name) : undefined;

  return (
    <Dialog
      title="New task"
      description="Something to follow up on."
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
            placeholder="Call Hina about the villa"
          />
          {fieldError("title") && (
            <span className="mt-1 block text-[12px] font-semibold text-red-600">
              {fieldError("title")}
            </span>
          )}
        </label>

        <label className="mt-4 block">
          <span className={label}>Due</span>
          <input
            name="due_at"
            type="datetime-local"
            required
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className={field}
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
            {saving ? "Saving…" : "Create task"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
