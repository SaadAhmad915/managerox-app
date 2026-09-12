import { Icon, type IconName } from "@/app/components/Icon";

/**
 * Stub for routes the shell links to but that aren't built yet. Keeps every
 * sidebar destination real so navigation can be tested end to end.
 */
export function PagePlaceholder({
  title,
  icon,
  description,
}: {
  title: string;
  icon: IconName;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="text-[26px] font-extrabold tracking-[-0.6px] sm:text-[30px]">
        {title}
      </h1>
      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon name={icon} size={28} />
        </div>
        <h2 className="mt-4 text-[17px] font-extrabold text-slate-900">
          {title} is not built yet
        </h2>
        <p className="mt-1.5 max-w-[420px] text-[14px] leading-[1.6] text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
