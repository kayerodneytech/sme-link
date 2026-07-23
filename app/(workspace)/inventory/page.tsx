import { InventoryView } from "@/components/inventory-view";
import { PageHeading } from "@/components/page-heading";

export default function InventoryPage() {
  return (
    <div className="content">
      <PageHeading
        description="Track products, available quantities and every stock movement."
        eyebrow="Operations"
        title="Inventory"
      />
      <InventoryView />
    </div>
  );
}
