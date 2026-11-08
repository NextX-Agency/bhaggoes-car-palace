import imageLoader from "./image-loader";
import { formatAmount, parseLocations, vehicleHeading, vehicleSpecifications, type SiteSettings, type Vehicle } from "./domain";

/** Everything printed on a car's window sticker, built from the car's saved data at the moment it is opened. */
export interface WindowStickerData {
  heading: string;
  make: string | null;
  year: number | null;
  condition: "New" | "Used";
  /** "Intern prijs" on the website; shown struck through when a lower cash price exists. */
  price: string | null;
  /** "Cash price · bank transfer" on the website. */
  cashPrice: string | null;
  /** Set only when the cash price is lower than the regular price. */
  savings: string | null;
  specifications: [string, string][];
  features: string[];
  benefits: string[];
  /** "8 November 2026": prices on a printed sticker are only valid on the day it was printed. */
  priceDate: string;
  business: { name: string; slogan: string; phone: string | null; whatsapp: string | null; email: string | null; locations: string[]; website: string; logo: string };
}

// The sheet is one A4 page; longer lists are cut so nothing spills onto a second page.
export const STICKER_MAX_FEATURES = 24;
export const STICKER_MAX_BENEFITS = 8;

export function buildWindowSticker(vehicle: Vehicle, settings: SiteSettings, website: string, now = new Date()): WindowStickerData {
  const currency = vehicle.currency ?? settings.currency;
  const regular = vehicle.price ?? null;
  const cash = vehicle.cash_price ?? null;
  const discounted = regular != null && cash != null && cash < regular;
  return {
    heading: vehicleHeading(vehicle),
    make: vehicle.make,
    year: vehicle.year,
    condition: vehicle.condition === "new" ? "New" : "Used",
    price: regular != null ? formatAmount(regular, currency) : null,
    cashPrice: cash != null ? formatAmount(cash, currency) : null,
    savings: discounted ? formatAmount(regular - cash, currency) : null,
    specifications: vehicleSpecifications(vehicle).filter(([label]) => label !== "Year"),
    features: vehicle.features.map((feature) => feature.trim()).filter(Boolean).slice(0, STICKER_MAX_FEATURES),
    benefits: settings.sales_terms.benefits.map((benefit) => benefit.trim()).filter(Boolean).slice(0, STICKER_MAX_BENEFITS),
    priceDate: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Paramaribo" }).format(now),
    business: {
      name: settings.business_name,
      slogan: settings.slogan,
      phone: settings.phone,
      whatsapp: settings.whatsapp && settings.whatsapp !== settings.phone ? settings.whatsapp : null,
      email: settings.email,
      locations: parseLocations(settings.address).map((location) => location.name ? `${location.name}: ${location.address}` : location.address),
      website: website.replace(/^https?:\/\//, "").replace(/\/+$/, ""),
      // A small copy of the logo (uploaded logos can be several MB), sharp enough for print at its printed size.
      logo: imageLoader({ src: settings.logo_url || "/images/bhaggoes-logo.webp", width: 800 }),
    },
  };
}
