import type { WindowStickerData } from "@/lib/window-sticker";

/**
 * The printed window sticker: one A4 page, black on white with thin lines and no filled areas so it uses little ink.
 * Only details that are filled in for the car are shown.
 */
export function WindowSticker({ data }: { data: WindowStickerData }) {
  const { business } = data;
  const discounted = Boolean(data.savings);
  const contact = [business.phone ? `Tel. ${business.phone}` : null, business.whatsapp ? `WhatsApp ${business.whatsapp}` : null, business.email].filter(Boolean);
  return <article className="wsticker" lang="en" aria-label={`Window sticker: ${data.heading}`}>
    <header className="ws-head">
      {/* eslint-disable-next-line @next/next/no-img-element -- printed as-is; next/image would resize it for screens */}
      <img className="ws-logo" src={business.logo} alt={business.name} />
      <div className="ws-head-text"><strong>{business.name}</strong>{business.slogan ? <span>{business.slogan}</span> : null}</div>
    </header>

    <section className="ws-title">
      <p className="ws-kicker">{[data.year, data.condition].filter(Boolean).join(" · ")}</p>
      <h1 className={data.heading.length > 60 ? "is-xlong" : data.heading.length > 32 ? "is-long" : undefined}>{data.heading}</h1>
    </section>

    <section className={`ws-prices${discounted ? " is-discounted" : ""}`} aria-label="Price">
      {data.price ? <div className={`ws-price${discounted ? " ws-price-was" : data.cashPrice ? "" : " ws-price-main"}`}><span>Intern prijs</span>{discounted ? <s>{data.price}</s> : <strong>{data.price}</strong>}</div> : null}
      {data.cashPrice ? <div className={`ws-price${discounted || !data.price ? " ws-price-main" : ""}`}><span>Cash price · bank transfer</span><strong>{data.cashPrice}</strong>{data.savings ? <em>You save {data.savings}</em> : null}</div> : null}
      {!data.price && !data.cashPrice ? <div className="ws-price ws-price-main"><span>Price</span><strong>Price on request</strong></div> : null}
    </section>

    <div className="ws-body">
    {data.specifications.length ? <section className="ws-block"><h2>Specifications</h2>
      <dl className="ws-specs">{data.specifications.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section> : null}

    {data.features.length ? <section className="ws-block"><h2>Options &amp; features</h2>
      <ul className="ws-list ws-list-3">{data.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
    </section> : null}

    {data.benefits.length ? <section className="ws-block"><h2>Included with purchase</h2>
      <ul className="ws-list ws-list-2">{data.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
    </section> : null}
    </div>

    <footer className="ws-foot">
      <div><strong>{business.name}</strong>{business.locations.map((location) => <span key={location}>{location}</span>)}</div>
      <div className="ws-foot-contact">{contact.map((line) => <span key={line}>{line}</span>)}<span className="ws-web">{business.website}</span></div>
    </footer>
  </article>;
}
