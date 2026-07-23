import { InventoryView } from "@/components/inventory-view";
import { PageHeading } from "@/components/page-heading";
import { Plus } from "lucide-react";

export default function InventoryPage() {
  return (
    <div className="content">
      <PageHeading
        action={<button className="button button-primary"><Plus size={18} /> Add product</button>}
        description="Track products, available quantities and every stock movement."
        eyebrow="Operations"
        title="Inventory"
      />
      <InventoryView />
    </div>
  );
}
