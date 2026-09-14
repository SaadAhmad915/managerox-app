import { PagePlaceholder } from "@/app/components/PagePlaceholder";

export const metadata = { title: "Settings · ManagerOX CRM" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Settings"
      icon="settings"
      description="Workspace, team, pipeline stages, permissions and billing configuration."
    />
  );
}
