import { PagePlaceholder } from "@/app/components/PagePlaceholder";

export const metadata = { title: "Automation · ManagerOX CRM" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Automation"
      icon="bolt"
      description="Rules that assign leads, trigger follow-up tasks and send notifications on their own."
    />
  );
}
