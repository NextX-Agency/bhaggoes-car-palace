export type VehicleCondition = "new" | "used";
export type Availability = "available" | "on_the_way" | "reserved" | "sold" | "rental";

export interface Vehicle {
  id: string;
  slug: string;
  title: string;
  make: string;
  model: string;
  variant: string | null;
  year: number | null;
  price: number | null;
  currency: string | null;
  mileage: number | null;
  engine_capacity: string | null;
  fuel_type: string | null;
  transmission: string | null;
  drive_type: string | null;
  body_type: string | null;
  exterior_color: string | null;
  interior_color: string | null;
  seats: number | null;
  doors: number | null;
  description: string | null;
  condition: VehicleCondition;
  availability: Availability;
  stock_number?: string | null;
  featured: boolean;
  published: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  images: VehicleImage[];
  features: string[];
}

export interface VehicleImage {
  id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
  url?: string;
}

export interface SiteSettings {
  business_name: string;
  slogan: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  business_hours: Record<string, string> | null;
  social_links: Record<string, string> | null;
  homepage_title: string;
  homepage_subtitle: string;
  seo_title: string;
  seo_description: string;
  about_text: string | null;
  financing_enabled: boolean;
  financing_notes: string | null;
  currency: string | null;
  show_sold: boolean;
  logo_path: string | null;
  logo_url?: string | null;
  updated_at?: string;
}

export interface VehicleFilters {
  search?: string;
  make?: string;
  model?: string;
  year?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: VehicleCondition;
  availability?: Availability;
  fuel?: string;
  transmission?: string;
  bodyType?: string;
  minMileage?: number;
  maxMileage?: number;
  sort?: "newest" | "oldest" | "price-asc" | "price-desc" | "year-desc" | "mileage-asc";
  page?: number;
  pageSize?: number;
}

export const defaultSettings: SiteSettings = {
  business_name: "Bhaggoes Car Palace",
  slogan: "WE BEAT ANYBODY'S PRICES",
  phone: "+597 894-6870",
  whatsapp: "+597 894-6870",
  email: null,
  address: "Kwattaweg 407, Paramaribo, Suriname",
  business_hours: null,
  social_links: { facebook: "https://www.facebook.com/100057843361600/" },
  homepage_title: "Browse Our Cars",
  homepage_subtitle: "",
  seo_title: "Bhaggoes Car Palace | Vehicle Inventory",
  seo_description: "Browse the Bhaggoes Car Palace vehicle inventory and contact the dealership about a car.",
  about_text: null,
  financing_enabled: false,
  financing_notes: null,
  currency: null,
  show_sold: false,
  logo_path: null,
  logo_url: null,
};

export const availabilityLabels: Record<Availability, string> = {
  available: "Available",
  on_the_way: "On the way",
  reserved: "Reserved",
  sold: "Sold",
  rental: "Rental",
};

export function calculateFinance(
  price: number,
  downPayment: number,
  annualRate: number,
  months: number,
) {
  if (![price, downPayment, annualRate, months].every(Number.isFinite)) return null;
  if (price <= 0 || downPayment < 0 || downPayment > price || annualRate < 0 || months <= 0) return null;
  const principal = price - downPayment;
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = monthlyRate === 0
    ? principal / months
    : principal * monthlyRate / (1 - (1 + monthlyRate) ** -months);
  const totalRepayment = monthlyPayment * months;
  return {
    monthlyPayment,
    totalInterest: Math.max(0, totalRepayment - principal),
    totalRepayment,
  };
}

export function formatAmount(value: number | null | undefined, currency?: string | null) {
  if (value == null || !Number.isFinite(value)) return "Price on request";
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  return currency ? `${currency} ${formatted}` : formatted;
}

export function formatMileage(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? null : `${new Intl.NumberFormat("en-US").format(value)} km`;
}

export function coverImage(images: VehicleImage[]) {
  return images.find((image) => image.is_cover && image.url) ?? images.find((image) => image.url) ?? null;
}

export function sortedImages(images: VehicleImage[]) {
  return [...images].filter((image) => image.url).sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
}

export function vehicleSpecifications(vehicle: Vehicle): [string, string][] {
  const rows: [string, string | null][] = [
    ["Year", vehicle.year?.toString() ?? null], ["Condition", vehicle.condition === "new" ? "New" : "Used"], ["Mileage", formatMileage(vehicle.mileage)],
    ["Engine", vehicle.engine_capacity], ["Fuel", vehicle.fuel_type], ["Transmission", vehicle.transmission], ["Drive type", vehicle.drive_type],
    ["Body type", vehicle.body_type], ["Exterior", vehicle.exterior_color], ["Interior", vehicle.interior_color],
    ["Seats", vehicle.seats?.toString() ?? null], ["Doors", vehicle.doors?.toString() ?? null], ["Stock no.", vehicle.stock_number ?? null],
  ];
  return rows.filter((row): row is [string, string] => Boolean(row[1]));
}

export function slugify(input: string) {
  return input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96);
}

export function buildWhatsAppLink(number: string | null | undefined, message: string) {
  const phone = number?.replace(/\D/g, "");
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
}

export type DealershipLocation = { name: string | null; address: string; mapUrl: string };

// The address setting holds one location per line, optionally named: "Showroom: Kwattaweg 100, Paramaribo".
export function parseLocations(value: string | null | undefined): DealershipLocation[] {
  return (value ?? "").split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const split = line.indexOf(": ");
    const name = split > 0 ? line.slice(0, split).trim() : null;
    const address = split > 0 ? line.slice(split + 2).trim() : line;
    const mapUrl = address.toLowerCase() === "kwattaweg 407, paramaribo, suriname"
      ? "https://maps.app.goo.gl/UgiPvc2SsBrTQYG79"
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    return { name, address, mapUrl };
  }).filter((location) => location.address);
}

export function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
