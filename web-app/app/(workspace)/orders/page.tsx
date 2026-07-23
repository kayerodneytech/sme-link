import { OrdersView } from "@/components/orders-view";
import { PageHeading } from "@/components/page-heading";

export default function OrdersPage() {
  return <div className="content"><PageHeading description="Track customer requests from pending order to completed sale." eyebrow="Digital sales" title="Orders" /><OrdersView /></div>;
}
