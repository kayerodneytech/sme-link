import { PageHeading } from "@/components/page-heading";
import { Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="content">
      <PageHeading description="Maintain the information used across your workspace." eyebrow="Manage" title="Business settings" />
      <form style={{ display: "grid", gap: 16, maxWidth: 850 }}>
        <section className="card card-pad"><div className="section-heading"><div><h2>Business details</h2><p>Shown on your workspace and exported reports</p></div></div><div className="form-grid"><div className="field"><label htmlFor="business-name">Business name</label><input className="input" defaultValue="Tariro Foods" id="business-name" /></div><div className="field"><label htmlFor="business-sector">Sector</label><select className="select" defaultValue="Retail" id="business-sector"><option>Retail</option><option>Services</option><option>Manufacturing</option><option>Hospitality</option></select></div><div className="field"><label htmlFor="business-phone">Phone</label><input className="input" defaultValue="+263 77 000 0000" id="business-phone" /></div><div className="field"><label htmlFor="business-location">Location</label><input className="input" defaultValue="Harare, Zimbabwe" id="business-location" /></div><div className="field"><label htmlFor="business-currency">Reporting currency</label><select className="select" defaultValue="USD" id="business-currency"><option>USD</option><option>ZiG</option><option>ZAR</option></select></div></div></section>
        <section className="card card-pad"><div className="section-heading"><div><h2>Stock defaults</h2><p>Used when a product does not have its own threshold</p></div></div><div className="form-grid"><div className="field"><label htmlFor="default-threshold">Default low-stock threshold</label><input className="input" defaultValue="5" id="default-threshold" min="0" type="number" /></div></div></section>
        <div><button className="button button-primary" type="submit"><Save size={17} /> Save changes</button></div>
      </form>
    </div>
  );
}
