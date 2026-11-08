import type { WindowStickerData } from "@/lib/window-sticker";

// The row at the top always shows the first four specifications that are filled in, in this order; whatever is left
// goes in the table, which is left out when nothing is left. Body style and stock number are shown above the title.
const KEY_SPECS = ["Mileage", "Transmission", "Fuel", "Engine", "Drivetrain", "Exterior", "Interior", "Seats", "Doors"];

/**
 * The printed window sticker: one page, black on white only (the dealership prints in black and white), thin lines,
 * no filled areas. Only details that are filled in for the car are shown.
 */
export function WindowSticker({ data }: { data: WindowStickerData }) {
  const { business } = data;
  const discounted = Boolean(data.savings);
  const specs = new Map(data.specifications);
  const keys = KEY_SPECS.filter((label) => specs.has(label)).slice(0, 4);
  const stock = specs.get("Stock number");
  const table = data.specifications.filter(([label]) => !keys.includes(label) && label !== "Stock number" && label !== "Body style");
  const contact = [business.phone ? `Tel. ${business.phone}` : null, business.whatsapp ? `WhatsApp ${business.whatsapp}` : null, business.email].filter(Boolean);
  const mainPrice = discounted ? data.cashPrice : data.price ?? data.cashPrice;
  const mainLabel = discounted || (!data.price && data.cashPrice) ? "Cash price · bank transfer" : data.price ? "Intern prijs" : "Price";

  return <article className="wsticker" lang="en" aria-label={`Window sticker: ${data.heading}`}>
    <header className="ws-head">
      {/* eslint-disable-next-line @next/next/no-img-element -- printed as-is; the loader already picked a small copy */}
      <img className="ws-logo" src={business.logo} alt={business.name} />
      <div className="ws-head-text"><strong>{business.name}</strong>{business.slogan ? <span>{business.slogan}</span> : null}</div>
    </header>

    <section className="ws-hero">
      <p className="ws-kicker">{[data.year, data.condition, specs.get("Body style")].filter(Boolean).join(" · ")}{stock ? <span>Stock # {stock}</span> : null}</p>
      <h1 className={data.heading.length > 60 ? "is-xlong" : data.heading.length > 30 ? "is-long" : undefined}>{data.heading}</h1>
    </section>

    <section className={`ws-deal${data.qr ? " has-qr" : ""}`}>
      <div className="ws-price-panel">
        <span className="ws-label">{mainLabel}</span>
        <strong className="ws-price-big">{mainPrice ?? "Price on request"}</strong>
        {discounted ? <p className="ws-price-sub">Intern prijs <s>{data.price}</s> <b>You save {data.savings}</b></p>
          : data.price && data.cashPrice ? <p className="ws-price-sub">Cash price · bank transfer <b>{data.cashPrice}</b></p> : null}
      </div>
      {data.qr ? <figure className="ws-qr">
        {/* Four modules of white around the code: the quiet zone scanners need. */}
        <svg viewBox={`-4 -4 ${data.qr.size + 8} ${data.qr.size + 8}`} role="img" aria-label={`QR code: ${data.qr.url}`} shapeRendering="crispEdges"><path d={data.qr.path} fill="#000" /></svg>
        <figcaption>Scan for photos,<br />details &amp; WhatsApp</figcaption>
      </figure> : null}
    </section>
    {data.price || data.cashPrice ? <p className="ws-price-note">Prices as of {data.priceDate}. Ask us about the current price and availability.</p> : null}

    {keys.length ? <dl className="ws-keys">{keys.map((label) => <div key={label}><dt>{label}</dt><dd>{specs.get(label)}</dd></div>)}</dl> : null}

    <div className="ws-body">
      {table.length ? <section className="ws-block"><h2>Specifications</h2>
        <dl className="ws-specs">{table.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section> : null}
      {data.features.length ? <section className="ws-block"><h2>Options &amp; features</h2>
        <ul className="ws-list ws-list-3">{data.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      </section> : null}
      {data.benefits.length ? <section className="ws-block"><h2>Included with your purchase</h2>
        <ul className="ws-list ws-list-2">{data.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
      </section> : null}
    </div>

    <footer className="ws-foot">
      <div><strong>{business.name}</strong>{business.locations.map((location) => <span key={location}>{location}</span>)}</div>
      <div className="ws-foot-contact">{contact.map((line) => <span key={line}>{line}</span>)}<span>{business.website}</span></div>
    </footer>
  </article>;
}
