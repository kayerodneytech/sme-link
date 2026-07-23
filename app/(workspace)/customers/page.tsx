import { CustomersView } from "@/components/customers-view";
import { PageHeading } from "@/components/page-heading";

export default function CustomersPage() {
  return (
    <div className="content">
      <PageHeading
        description="Keep contact and company details for repeat work, quotes and follow-up."
        eyebrow="Relationships"
        title="Customers"
      />
      <CustomersView />
    </div>
  );
}
