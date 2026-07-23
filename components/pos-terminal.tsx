"use client";

import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import { Barcode, Check, LoaderCircle, Minus, Plus, Printer, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataLoadingState } from "./data-loading-state";
import { BusinessMenu } from "./business-menu";

type Product = { id: string; name: string; sku: string; barcode: string; category: string; price: number; stock: number; unit: string };
type Customer = { id: string; name: string };
type CartLine = Product & { quantity: number };

export function PosTerminal({ businessId, businessName, primaryCurrency }: {
  businessId: string; businessName: string; primaryCurrency: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const currency = primaryCurrency;
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<{ number: string; date: string; lines: CartLine[]; total: number } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("product_stock").select("id, name, sku, barcode, category, selling_price, quantity_on_hand, unit, product_type").eq("business_id", businessId).eq("is_archived", false).eq("product_type", "stocked").order("name"),
      supabase.from("customers").select("id, name").eq("business_id", businessId).eq("is_archived", false).order("name"),
    ]).then(([productResult, customerResult]) => {
      setProducts((productResult.data ?? []).map((product) => ({
        id: product.id, name: product.name, sku: product.sku ?? "", barcode: product.barcode ?? "",
        category: product.category ?? "Other", price: Number(product.selling_price),
        stock: Number(product.quantity_on_hand), unit: product.unit,
      })));
      setCustomers(customerResult.data ?? []);
      setLoading(false);
    });
  }, [businessId]);

  useEffect(() => {
    function shortcuts(event: KeyboardEvent) {
      if (event.key === "/" && document.activeElement !== searchRef.current) {
        event.preventDefault(); searchRef.current?.focus();
      }
      if (event.key === "F2") { event.preventDefault(); void checkout(); }
      if (event.key === "Escape") { setQuery(""); searchRef.current?.focus(); }
    }
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  });

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((product) => product.category)))], [products]);
  const shownProducts = products.filter((product) => {
    const term = query.trim().toLowerCase();
    const matches = !term || `${product.name} ${product.sku} ${product.barcode} ${product.category}`.toLowerCase().includes(term);
    return matches && (category === "All" || product.category === category);
  });
  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  function add(product: Product) {
    setCart((current) => {
      const line = current.find((item) => item.id === product.id);
      if (line) return current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) } : item);
      return product.stock > 0 ? [...current, { ...product, quantity: 1 }] : current;
    });
    setQuery("");
    searchRef.current?.focus();
  }

  function changeQuantity(id: string, amount: number) {
    setCart((current) => current
      .map((line) => line.id === id ? { ...line, quantity: Math.max(0, Math.min(line.stock, line.quantity + amount)) } : line)
      .filter((line) => line.quantity > 0));
  }

  function searchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const exact = products.find((product) => [product.barcode, product.sku].some((code) => code && code.toLowerCase() === query.trim().toLowerCase()));
    if (exact) add(exact);
    else if (shownProducts.length === 1) add(shownProducts[0]);
  }

  async function checkout() {
    if (!cart.length || paying) return;
    setPaying(true); setMessage("");
    const supabase = createClient();
    try {
      const { data: sale, error: saleError } = await supabase.from("sales").insert({
        business_id: businessId, customer_id: customerId || null, payment_method: paymentMethod,
      }).select("id, sale_number, created_at").single();
      if (saleError) throw saleError;
      const { error: itemsError } = await supabase.from("sale_items").insert(cart.map((line) => ({
        sale_id: sale.id, product_id: line.id, quantity: line.quantity, unit_price: line.price,
      })));
      if (itemsError) throw itemsError;
      const { error: completionError } = await supabase.rpc("complete_sale", { target_sale_id: sale.id });
      if (completionError) throw completionError;
      setReceipt({ number: `SL-${String(sale.sale_number).padStart(4, "0")}`, date: sale.created_at, lines: cart, total });
      setProducts((current) => current.map((product) => {
        const sold = cart.find((line) => line.id === product.id)?.quantity ?? 0;
        return { ...product, stock: product.stock - sold };
      }));
      setCart([]); setCustomerId("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The sale could not be completed.");
    } finally { setPaying(false); }
  }

  if (loading) return <div className="pos-loading"><DataLoadingState /></div>;

  return (
    <main className="pos-shell">
      <header className="pos-header">
        <div><BusinessMenu mode="pos" posEnabled /><div><strong>{businessName}</strong><small>Retail point of sale</small></div></div>
        <div className="pos-shortcuts"><span><kbd>/</kbd> Search</span><span><kbd>F2</kbd> Pay</span><span><kbd>Esc</kbd> Clear search</span></div>
      </header>

      <div className="pos-workspace">
        <section className="pos-catalogue">
          <div className="pos-search"><Search size={20} /><input autoFocus onChange={(event) => setQuery(event.target.value)} onKeyDown={searchKeyDown} placeholder="Search name, category, SKU or scan barcode" ref={searchRef} value={query} /><Barcode size={21} /></div>
          <div className="pos-categories">{categories.map((item) => <button data-active={category === item} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}</div>
          <div className="pos-products">
            {shownProducts.map((product) => <button className="pos-product" disabled={product.stock <= 0} key={product.id} onClick={() => add(product)} type="button"><span className="pos-product-icon">{product.name.slice(0, 2).toUpperCase()}</span><strong>{product.name}</strong><small>{product.sku || product.category}</small><div><b>{formatMoney(product.price, currency)}</b><span>{product.stock} {product.unit}</span></div></button>)}
            {!shownProducts.length && <div className="pos-empty"><Search size={28} /><strong>No matching products</strong><p>Try the name, category, SKU or barcode.</p></div>}
          </div>
        </section>

        <aside className="pos-cart">
          <div className="pos-cart-heading"><div><ShoppingCart size={20} /><strong>Current sale</strong></div><button aria-label="Clear cart" className="icon-button" disabled={!cart.length} onClick={() => setCart([])} type="button"><Trash2 size={17} /></button></div>
          <div className="pos-cart-lines">
            {cart.map((line) => <article className="pos-cart-line" key={line.id}><div><strong>{line.name}</strong><small>{formatMoney(line.price, currency)} each</small></div><div className="pos-quantity"><button onClick={() => changeQuantity(line.id, -1)} type="button"><Minus size={14} /></button><span>{line.quantity}</span><button onClick={() => changeQuantity(line.id, 1)} type="button"><Plus size={14} /></button></div><b>{formatMoney(line.price * line.quantity, currency)}</b></article>)}
            {!cart.length && <div className="pos-empty"><ShoppingCart size={30} /><strong>Cart is empty</strong><p>Tap a product or scan its barcode.</p></div>}
          </div>
          <div className="pos-checkout">
            <div className="form-grid"><div className="field"><label htmlFor="pos-customer">Customer</label><select className="select" id="pos-customer" onChange={(event) => setCustomerId(event.target.value)} value={customerId}><option value="">Walk-in customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div><div className="field"><label htmlFor="pos-payment">Payment</label><select className="select" id="pos-payment" onChange={(event) => setPaymentMethod(event.target.value)} value={paymentMethod}><option value="cash">Cash</option><option value="ecocash">EcoCash</option><option value="bank_transfer">Bank transfer</option><option value="card">Card</option></select></div></div>
            <div className="pos-total"><span>Total</span><strong>{formatMoney(total, currency)}</strong></div>
            {message && <p className="form-message form-message-error">{message}</p>}
            <button className="button button-primary pos-pay" disabled={!cart.length || paying} onClick={() => void checkout()} type="button">{paying ? <LoaderCircle className="spin" size={20} /> : <Check size={20} />}{paying ? "Completing sale…" : `Pay ${formatMoney(total, currency)}`}<kbd>F2</kbd></button>
          </div>
        </aside>
      </div>

      {receipt && <div className="dialog-backdrop receipt-backdrop"><section className="dialog receipt-dialog"><button aria-label="Close receipt" className="icon-button receipt-close" onClick={() => setReceipt(null)} type="button"><X size={18} /></button><div className="receipt"><h2>{businessName}</h2><p>{receipt.number} · {new Date(receipt.date).toLocaleString()}</p>{receipt.lines.map((line) => <div key={line.id}><span>{line.quantity} × {line.name}</span><b>{formatMoney(line.price * line.quantity, currency)}</b></div>)}<div className="receipt-total"><span>Total</span><strong>{formatMoney(receipt.total, currency)}</strong></div><small>Thank you for your business.</small></div><div className="dialog-actions no-print"><button className="button button-secondary" onClick={() => setReceipt(null)} type="button">New sale</button><button className="button button-primary" onClick={() => window.print()} type="button"><Printer size={17} /> Print receipt</button></div></section></div>}
    </main>
  );
}
