import { coverImage, isDemoVehicle, parseLocations, safeExternalUrl, type SiteSettings, type Vehicle } from "@/lib/domain";
import { absoluteUrl, shareImageUrl } from "@/lib/site-url";

export const defaultShareImage = { url: "/images/og-default.jpg", width: 1200, height: 630, alt: "Bhaggoes Car Palace, car dealership in Suriname" };

export function vehicleName(vehicle: Pick<Vehicle, "year" | "make" | "model" | "variant">) {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ");
}

// Cuts at a word boundary so search snippets and link previews never end mid-word.
export function trimDescription(text: string | null | undefined, max = 155) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).replace(/[\s,.;:-]+$/, "")}…`;
}

export function vehicleDescription(vehicle: Vehicle, settings: Pick<SiteSettings, "business_name" | "currency">) {
  if (isDemoVehicle(vehicle)) return `View the ${vehicleName(vehicle)} and contact ${settings.business_name} for current availability.`;
  if (vehicle.description?.trim()) return trimDescription(vehicle.description);
  const currency = vehicle.currency ?? settings.currency;
  const facts = [
    vehicle.mileage != null ? `${new Intl.NumberFormat("en-US").format(vehicle.mileage)} km` : null,
    vehicle.transmission, vehicle.fuel_type,
    vehicle.price != null ? `${currency ? `${currency} ` : ""}${new Intl.NumberFormat("en-US").format(vehicle.price)}` : null,
  ].filter(Boolean).join(", ");
  return trimDescription(`${vehicleName(vehicle)}${facts ? `: ${facts}` : ""}. See photos and ask ${settings.business_name} about this car.`);
}

export function vehicleShareImages(vehicle: Vehicle, limit = 1) {
  const cover = coverImage(vehicle.images);
  const ordered = [cover, ...vehicle.images.filter((image) => image !== cover)].filter((image): image is NonNullable<typeof image> => Boolean(image?.url));
  return ordered.slice(0, limit).map((image) => ({ url: shareImageUrl(image.url!), alt: image.alt_text ?? vehicleName(vehicle) }));
}

export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function dealerBase(settings: SiteSettings) {
  const sameAs = Object.values(settings.social_links ?? {}).map((url) => safeExternalUrl(url)).filter((url): url is string => Boolean(url));
  return {
    "@type": "AutoDealer",
    name: settings.business_name,
    url: absoluteUrl("/"),
    telephone: settings.phone ?? undefined,
    email: settings.email ?? undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

// AutoDealer (a LocalBusiness) for the home and contact pages; every location becomes its own branch with an address.
export function dealerJsonLd(settings: SiteSettings, { website = true }: { website?: boolean } = {}) {
  const locations = parseLocations(settings.address);
  const branches = locations.map((location) => ({
    "@type": "AutoDealer",
    name: location.name ? `${settings.business_name} ${location.name}` : settings.business_name,
    telephone: settings.phone ?? undefined,
    hasMap: location.mapUrl,
    address: { "@type": "PostalAddress", streetAddress: location.address.replace(/,?\s*Suriname$/i, ""), addressCountry: "SR" },
  }));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...dealerBase(settings),
        "@id": absoluteUrl("/#dealer"),
        description: settings.seo_description,
        slogan: settings.slogan || undefined,
        logo: absoluteUrl("/images/bhaggoes-logo-approved.png"),
        image: absoluteUrl(defaultShareImage.url),
        areaServed: { "@type": "Country", name: "Suriname" },
        address: branches.length === 1 ? branches[0].address : undefined,
        department: branches.length > 1 ? branches : undefined,
      },
      ...(website ? [{
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        url: absoluteUrl("/"),
        name: settings.business_name,
        publisher: { "@id": absoluteUrl("/#dealer") },
        potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/cars")}?search={search_term_string}` }, "query-input": "required name=search_term_string" },
      }] : []),
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}

const availabilityUrl: Record<string, string> = {
  available: "https://schema.org/InStock",
  on_the_way: "https://schema.org/PreOrder",
  reserved: "https://schema.org/LimitedAvailability",
  sold: "https://schema.org/SoldOut",
  rental: "https://schema.org/InStock",
};

export function vehicleJsonLd(vehicle: Vehicle, settings: SiteSettings) {
  const demo = isDemoVehicle(vehicle);
  const currency = (vehicle.currency ?? settings.currency ?? "").trim().toUpperCase();
  const validCurrency = /^[A-Z]{3}$/.test(currency);
  const seller = { ...dealerBase(settings), "@id": absoluteUrl("/#dealer") };
  const offer = (price: number | null | undefined, name: string) => demo || price == null || !validCurrency ? [] : [{
    "@type": "Offer",
    name,
    price,
    priceCurrency: currency,
    availability: availabilityUrl[vehicle.availability] ?? "https://schema.org/LimitedAvailability",
    itemCondition: vehicle.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    businessFunction: vehicle.availability === "rental" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
    url: absoluteUrl(`/cars/${vehicle.slug}`),
    seller,
  }];
  const offers = [...offer(vehicle.price, "In-house price"), ...offer(vehicle.cash_price, "Cash price")];
  const images = vehicle.images.filter((image) => image.url).slice(0, 8).map((image) => shareImageUrl(image.url!));
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    "@id": absoluteUrl(`/cars/${vehicle.slug}#vehicle`),
    url: absoluteUrl(`/cars/${vehicle.slug}`),
    name: vehicleName(vehicle),
    description: vehicleDescription(vehicle, settings),
    sku: demo ? undefined : vehicle.stock_number ?? undefined,
    brand: { "@type": "Brand", name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: vehicle.year?.toString(),
    bodyType: vehicle.body_type ?? undefined,
    color: vehicle.exterior_color ?? undefined,
    vehicleInteriorColor: vehicle.interior_color ?? undefined,
    fuelType: vehicle.fuel_type ?? undefined,
    vehicleTransmission: vehicle.transmission ?? undefined,
    driveWheelConfiguration: vehicle.drive_type ?? undefined,
    numberOfDoors: vehicle.doors ?? undefined,
    vehicleSeatingCapacity: vehicle.seats ?? undefined,
    vehicleEngine: vehicle.engine_capacity ? { "@type": "EngineSpecification", name: vehicle.engine_capacity } : undefined,
    itemCondition: vehicle.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    mileageFromOdometer: vehicle.mileage == null ? undefined : { "@type": "QuantitativeValue", value: vehicle.mileage, unitCode: "KMT" },
    image: images.length ? images : undefined,
    offers: offers.length === 0 ? undefined : offers.length === 1 ? offers[0] : offers,
  };
}
