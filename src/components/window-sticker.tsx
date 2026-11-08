import { Check, Cog, Fuel, Gauge, Route, Smartphone, Zap, type LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import type { WindowStickerData } from "@/lib/window-sticker";

// The specifications shown as large tiles at the top (first four that are filled in); the rest go in the table.
const KEY_SPECS: [string, LucideIcon][] = [["Mileage", Gauge], ["Transmission", Cog], ["Fuel", Fuel], ["Engine", Zap], ["Drivetrain", Route]];

/**
 * The printed window sticker: one page, white paper, black text with thin lines and Bhaggoes red accents, no filled
 * areas, so it looks bold without using much ink. Only details that are filled in for the car are shown.
 */
export function WindowSticker({ data }: { data: WindowStickerData }) {
  const { business } = data;
  const discounted = Boolean(data.savings);
  const specs = new Map(data.specifications);
  const tiles = KEY_SPECS.filter(([label]) => specs.has(label)).slice(0, 4);
  const tileLabels = new Set(tiles.map(([label]) => label));
  const stock = specs.get("Stock number");
  const bodyStyle = specs.get("Body style");
  const table = data.specifications.filter(([label]) => !tileLabels.has(label) && label !== "Stock number");
  const contact = [business.phone ? `Tel. ${business.phone}` : null, business.whatsapp ? `WhatsApp ${business.whatsapp}` : null, business.email].filter(Boolean);
  const mainPrice = discounted ? data.cashPrice : data.price ?? data.cashPrice;
  const mainLabel = discounted || (!data.price && data.cashPrice) ? "Cash price · bank transfer" : data.price ? "Intern prijs" : "Price";

  return <article className="wsticker" lang="en" aria-label={`Window sticker: ${data.heading}`}>
    <header className="ws-head">
      {/* eslint-disable-next-line @next/next/no-img-element -- printed as-is; the loader already picked a small copy */}
      <img className="ws-logo" src={business.logo} alt={business.name} />
      <div className="ws-head-text">
        <span className="ws-eyebrow">Vehicle information</span>
        <strong>{business.name}</strong>
        {stock ? <span className="ws-stock">Stock # {stock}</span> : null}
      </div>
    </header>

    <section className="ws-hero">
      {data.make ? <span className="ws-make" aria-hidden="true"><BrandLogo make={data.make} /></span> : null}
      <div>
        <p className="ws-kicker">{[data.year, data.condition, bodyStyle].filter(Boolean).join("  ·  ")}</p>
        <h1 className={data.heading.length > 60 ? "is-xlong" : data.heading.length > 30 ? "is-long" : undefined}>{data.heading}</h1>
      </div>
    </section>

    <section className={`ws-deal${data.qr ? " has-qr" : ""}`}>
      <div className="ws-price-panel">
        <span className="ws-price-label">{mainLabel}</span>
        <strong className="ws-price-big">{mainPrice ?? "Price on request"}</strong>
        {discounted ? <div className="ws-price-row">
          <span className="ws-was">Intern prijs <s>{data.price}</s></span>
          <span className="ws-save">Save {data.savings}</span>
        </div> : data.price && data.cashPrice ? <div className="ws-price-row"><span className="ws-was">Cash price · bank transfer <b>{data.cashPrice}</b></span></div> : null}
      </div>
      {data.qr ? <figure className="ws-qr">
        <figcaption className="ws-qr-title">Scan me</figcaption>
        {/* Four modules of white around the code: the quiet zone scanners need. */}
        <svg viewBox={`-4 -4 ${data.qr.size + 8} ${data.qr.size + 8}`} role="img" aria-label={`QR code: ${data.qr.url}`} shapeRendering="crispEdges"><path d={data.qr.path} fill="#000" /></svg>
        <span className="ws-qr-text"><Smartphone aria-hidden="true" /><span>All photos, details<br />&amp; WhatsApp chat</span></span>
      </figure> : null}
    </section>
    {data.price || data.cashPrice ? <p className="ws-price-note">Prices as of {data.priceDate}. Ask us about the current price and availability.</p> : null}

    {tiles.length ? <section className="ws-tiles" aria-label="Key specifications">
      {tiles.map(([label, Icon]) => <div key={label} className="ws-tile"><Icon aria-hidden="true" /><span>{label}</span><strong>{specs.get(label)}</strong></div>)}
    </section> : null}

    <div className="ws-body">
      {table.length ? <section className="ws-block"><h2>Specifications</h2>
        <dl className="ws-specs">{table.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section> : null}

      {data.features.length ? <section className="ws-block"><h2>Options &amp; features</h2>
        <ul className="ws-list ws-list-3">{data.features.map((feature) => <li key={feature}><Check aria-hidden="true" />{feature}</li>)}</ul>
      </section> : null}

      {data.benefits.length ? <section className="ws-block ws-benefits"><h2>Included with your purchase</h2>
        <ul className="ws-list ws-list-2">{data.benefits.map((benefit) => <li key={benefit}><Check aria-hidden="true" />{benefit}</li>)}</ul>
      </section> : null}
    </div>

    <footer className="ws-foot">
      <div><strong>{business.name}</strong>{business.slogan ? <span className="ws-slogan">{business.slogan}</span> : null}{business.locations.map((location) => <span key={location}>{location}</span>)}</div>
      <div className="ws-foot-contact">{contact.map((line) => <span key={line}>{line}</span>)}<span className="ws-web">{business.website}</span></div>
    </footer>
  </article>;
}
