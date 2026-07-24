import { InvoiceToolbar } from "@/components/invoice-toolbar";
import { formatDate, formatMoney } from "@/lib/format";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!hasSupabaseConfig()) {
    return (
      <div className="content">
        <p className="form-message form-message-error">
          Connect Supabase to view invoices.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      `
      id,
      invoice_number,
      issue_date,
      due_date,
      total,
      subtotal,
      currency,
      status,
      notes,
      payment_method,
      paid_at,
      businesses(name, phone, location, currency),
      customers(name, company_name, phone, email, address, city),
      invoice_items(id, description, quantity, unit_price, line_total)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !invoice) notFound();

  const business = Array.isArray(invoice.businesses)
    ? invoice.businesses[0]
    : invoice.businesses;
  const customer = Array.isArray(invoice.customers)
    ? invoice.customers[0]
    : invoice.customers;
  const items = invoice.invoice_items ?? [];
  const number = `INV-${String(invoice.invoice_number).padStart(4, "0")}`;
  const currency = invoice.currency ?? "USD";

  return (
    <div className="content invoice-page">
      <InvoiceToolbar
        invoice={{
          businessName: business?.name ?? "Business",
          businessPhone: business?.phone,
          businessLocation: business?.location,
          invoiceNumber: number,
          status: String(invoice.status),
          issueDate: invoice.issue_date,
          dueDate: invoice.due_date,
          paidAt: invoice.paid_at,
          paymentMethod: invoice.payment_method,
          currency,
          notes: invoice.notes,
          customerName: customer?.name ?? "Customer",
          customerCompany: customer?.company_name,
          customerPhone: customer?.phone,
          customerEmail: customer?.email,
          customerAddress: [customer?.address, customer?.city]
            .filter(Boolean)
            .join(", "),
          items: items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            lineTotal: Number(item.line_total),
          })),
          total: Number(invoice.total),
        }}
      />

      <article className="card card-pad invoice-sheet">
        <header className="invoice-sheet-head">
          <div>
            <p className="eyebrow">Invoice</p>
            <h1>{number}</h1>
            <p className="list-meta">
              Status: {String(invoice.status).toUpperCase()}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <strong>{business?.name ?? "Business"}</strong>
            {business?.location && <p className="list-meta">{business.location}</p>}
            {business?.phone && <p className="list-meta">{business.phone}</p>}
          </div>
        </header>

        <div className="invoice-meta-grid">
          <div>
            <p className="list-meta">Bill to</p>
            <strong>{customer?.name ?? "Customer"}</strong>
            {customer?.company_name && (
              <p className="list-meta">{customer.company_name}</p>
            )}
            {customer?.phone && <p className="list-meta">{customer.phone}</p>}
            {customer?.email && <p className="list-meta">{customer.email}</p>}
            {(customer?.address || customer?.city) && (
              <p className="list-meta">
                {[customer?.address, customer?.city].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <div>
            <p className="list-meta">Issued</p>
            <strong>{formatDate(invoice.issue_date)}</strong>
            <p className="list-meta" style={{ marginTop: 10 }}>
              Due
            </p>
            <strong>{formatDate(invoice.due_date)}</strong>
            {invoice.paid_at && (
              <>
                <p className="list-meta" style={{ marginTop: 10 }}>
                  Paid
                </p>
                <strong>
                  {formatDate(String(invoice.paid_at).slice(0, 10))}
                  {invoice.payment_method
                    ? ` · ${String(invoice.payment_method).replace("_", " ")}`
                    : ""}
                </strong>
              </>
            )}
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 24 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{Number(item.quantity)}</td>
                  <td>{formatMoney(Number(item.unit_price), currency)}</td>
                  <td className="table-name">
                    {formatMoney(Number(item.line_total), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="invoice-total-row">
          <span>Total</span>
          <strong>{formatMoney(Number(invoice.total), currency)}</strong>
        </div>

        {invoice.notes && (
          <p className="list-meta" style={{ marginTop: 18 }}>
            Note: {invoice.notes}
          </p>
        )}

        <p className="list-meta" style={{ marginTop: 28 }}>
          Thank you for your business.
        </p>
      </article>
    </div>
  );
}
