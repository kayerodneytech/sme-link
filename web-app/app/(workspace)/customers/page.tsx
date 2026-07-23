import { CustomersView } from "@/components/customers-view";
import { PageHeading } from "@/components/page-heading";

export default function CustomersPage() {
  return <div className="content"><PageHeading description="Save customer details and review their order history." eyebrow="Relationships" title="Customers" /><CustomersView /></div>;
}
