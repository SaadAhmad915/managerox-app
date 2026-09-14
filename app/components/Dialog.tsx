"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/app/components/Icon";

/**
 * Modal shell. Closes on Escape and on backdrop click, moves focus inside on
 * open and restores it on close, and locks background scrolling so the page
 * behind does not drift while the dialog is up.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    panelRef.current
      ?.querySelector<HTMLElement>(
        "input, select, textarea, button:not([data-dialog-close])",
      )
      ?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:max-w-[460px] sm:rounded-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-extrabold text-slate-900">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[13px] text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            data-dialog-close
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
