import { PageHeading } from "@/components/page-heading";
import {
  BarChart3,
  ChevronRight,
  ReceiptText,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";

const items = [
  { href: "/expenses", label: "Expenses", copy: "Record and review business costs", icon: ReceiptText },
  { href: "/customers", label: "Customers", copy: "Manage customer contact details", icon: Users },
  { href: "/reports", label: "Reports", copy: "Review financial and stock performance", icon: BarChart3 },
  { href: "/settings", label: "Settings", copy: "Update business and account details", icon: Settings },
];

export default function MorePage() {
  return (
    <div className="content">
      <PageHeading
        description="Additional areas of your SMElink workspace."
        eyebrow="Workspace"
        title="More"
      />
      <section className="card card-pad">
        <div className="list">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="list-row" href={item.href} key={item.href} style={{ textDecoration: "none" }}>
                <span className="list-icon"><Icon size={19} /></span>
                <span className="list-body">
                  <span className="list-title" style={{ display: "block" }}>{item.label}</span>
                  <span className="list-meta">{item.copy}</span>
                </span>
                <ChevronRight color="#98A2B3" size={18} style={{ marginLeft: "auto" }} />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
