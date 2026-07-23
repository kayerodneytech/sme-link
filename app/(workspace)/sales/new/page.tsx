import { PageHeading } from "@/components/page-heading";
import { SaleForm } from "@/components/sale-form";

export default function NewSalePage() {
  return (
    <div className="content">
      <PageHeading
        description="Add the items sold and confirm how the customer paid."
        eyebrow="New transaction"
        title="Record a sale"
      />
      <SaleForm />
    </div>
  );
}
