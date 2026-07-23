import { PageHeading } from "@/components/page-heading";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  Boxes,
  Check,
  ReceiptText,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";

type SetupProgress = {
  products: boolean;
  customers: boolean;
  sales: boolean;
  expenses: boolean;
};

type SetupData = {
  progress: SetupProgress;
  needs: string[];
  tracksInventory: boolean;
};

async function getSetupProgress(): Promise<SetupData> {
  if (!hasSupabaseConfig()) {
    return {
      progress: { products: false, customers: false, sales: false, expenses: false },
      needs: ["sales", "inventory", "orders", "customers", "expenses", "reports"],
      tracksInventory: true,
    };
  }

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, businesses(primary_needs, tracks_inventory)")
    .eq("status", "active")
    .limit(1)
    .single();

  if (!membership) {
    return {
      progress: { products: false, customers: false, sales: false, expenses: false },
      needs: [],
      tracksInventory: false,
    };
  }

  const businessId = membership.business_id;
  const [products, customers, sales, expenses] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("sales").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "completed"),
    supabase.from("expenses").select("id", { count: "exact", head: true }).eq("business_id", businessId),
  ]);

  const business = Array.isArray(membership.businesses)
    ? membership.businesses[0]
    : membership.businesses;

  return {
    progress: {
      products: Boolean(products.count),
      customers: Boolean(customers.count),
      sales: Boolean(sales.count),
      expenses: Boolean(expenses.count),
    },
    needs: business?.primary_needs ?? [],
    tracksInventory: business?.tracks_inventory ?? false,
  };
}

const steps = [
  {
    key: "products" as const,
    title: "Add what you sell",
    copy: "Add a product or service. For stock, include how many you have now and when you want a low-stock warning.",
    action: "Add products",
    href: "/inventory",
    icon: Boxes,
  },
  {
    key: "customers" as const,
    title: "Save a regular customer",
    copy: "This is optional for walk-in sales, but useful for orders and repeat customers.",
    action: "Add customer",
    href: "/customers",
    icon: Users,
  },
  {
    key: "sales" as const,
    title: "Record the first sale",
    copy: "This starts building the money-in picture on your dashboard.",
    action: "Record sale",
    href: "/sales/new",
    icon: ShoppingBag,
  },
  {
    key: "expenses" as const,
    title: "Record a business cost",
    copy: "Add rent, transport, stock purchases or another cost to see where money goes.",
    action: "Add expense",
    href: "/expenses",
    icon: ReceiptText,
  },
];

export default async function SetupPage() {
  const setup = await getSetupProgress();
  const availableSteps = steps
    .filter((step) => {
      if (step.key === "products") return true;
      if (step.key === "sales") return setup.needs.includes("sales");
      if (step.key === "customers") {
        return setup.needs.some((need) => ["customers", "orders"].includes(need));
      }
      return setup.needs.some((need) => ["expenses", "reports"].includes(need));
    })
    .map((step) =>
      step.key === "products" && !setup.tracksInventory
        ? {
            ...step,
            title: "Add what you sell",
            copy: "Add the services or products customers buy from the business.",
          }
        : step,
    );
  const completed = availableSteps.filter((step) => setup.progress[step.key]).length;

  return (
    <div className="content setup-page">
      <PageHeading
        description="Complete these practical steps now, or come back to them later."
        eyebrow="Getting started"
        title="Set up the business for daily use"
      />

      <section className="card setup-progress">
        <div>
          <strong>{completed} of {availableSteps.length} complete</strong>
          <p>These steps are based on what you chose during account setup. They can be changed later.</p>
        </div>
        <div className="progress-track" aria-label={`${completed} of ${availableSteps.length} setup steps complete`}>
          <span style={{ width: `${(completed / availableSteps.length) * 100}%` }} />
        </div>
      </section>

      <section className="setup-list">
        {availableSteps.map((step, index) => {
          const Icon = step.icon;
          const done = setup.progress[step.key];
          return (
            <article className="card setup-step" key={step.key}>
              <span className={done ? "setup-step-icon setup-step-done" : "setup-step-icon"}>
                {done ? <Check size={20} /> : <Icon size={20} />}
              </span>
              <div>
                <span className="eyebrow">Step {index + 1}</span>
                <h2>{step.title}</h2>
                <p>{step.copy}</p>
              </div>
              <Link className={done ? "button button-secondary" : "button button-primary"} href={step.href}>
                {done ? "View" : step.action}
                <ArrowRight size={17} />
              </Link>
            </article>
          );
        })}
      </section>

      <div className="setup-finish">
        <p>You can change business details and stock levels at any time.</p>
        <Link className="button button-secondary" href="/dashboard">
          Go to dashboard
          <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
