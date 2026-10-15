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
  phone: null,
  whatsapp: null,
  email: null,
  address: null,
  business_hours: null,
  social_links: null,
  homepage_title: "Find a car that feels right.",
  homepage_subtitle: "Great cars. Straightforward prices.",
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

export function slugify(input: string) {
  return input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96);
}

export function buildWhatsAppLink(number: string | null | undefined, message: string) {
  const phone = number?.replace(/\D/g, "");
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
}
