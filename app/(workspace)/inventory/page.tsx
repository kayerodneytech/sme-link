import { PageHeading } from "@/components/page-heading";
import { InventoryView } from "@/components/inventory-view";

export default function InventoryPage() {
  return (
    <div className="content">
      <PageHeading
        description="Add what you sell, group it simply, and keep track of how many you have."
        eyebrow="Stock"
        title="Products and stock"
      />
      <InventoryView />
    </div>
  );
}
