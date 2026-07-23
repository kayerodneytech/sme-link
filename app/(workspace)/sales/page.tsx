import { PageHeading } from "@/components/page-heading";
import { SalesView } from "@/components/sales-view";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function SalesPage() {
  return (
    <div className="content">
      <PageHeading
        action={<Link className="button button-primary" href="/sales/new"><Plus size={18} /> Record sale</Link>}
        description="Record completed transactions and review business income."
        eyebrow="Money in"
        title="Sales"
      />
      <SalesView />
    </div>
  );
}
