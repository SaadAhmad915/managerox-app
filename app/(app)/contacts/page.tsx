import { PagePlaceholder } from "@/app/components/PagePlaceholder";

export const metadata = { title: "Contacts · ManagerOX CRM" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Contacts"
      icon="person"
      description="A searchable directory of people and companies, with activity history per contact."
    />
  );
}
