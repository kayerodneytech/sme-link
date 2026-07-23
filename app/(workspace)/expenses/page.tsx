import { ExpensesView } from "@/components/expenses-view";
import { PageHeading } from "@/components/page-heading";

export default function ExpensesPage() {
  return <div className="content"><PageHeading description="Capture business costs and understand where money is being spent." eyebrow="Money out" title="Expenses" /><ExpensesView /></div>;
}
