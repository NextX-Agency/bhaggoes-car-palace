import { vehicleMakes } from "./vehicle-catalog";

export interface ImportedListing {
  fields: Partial<Record<"year" | "make" | "model" | "fuel_type" | "transmission" | "body_type" | "seats" | "stock_number" | "price" | "cash_price", string>>;
  features: string[];
}

const knownMakes = vehicleMakes;
const makeAliases = [
  ["Mercedes Benz", "Mercedes-Benz"], ["Mercedes", "Mercedes-Benz"],
  ["Land-Rover", "Land Rover"], ["Greatwall", "Great Wall"],
  ["Citroen", "Citroën"], ["Skoda", "Škoda"], ["VW", "Volkswagen"],
] as const;
const makeMatches = [
  ...makeAliases.map(([alias, canonical]) => ({ prefix: alias, make: canonical })),
  ...knownMakes.map((candidate) => ({ prefix: candidate, make: candidate })),
].sort((a, b) => b.prefix.length - a.prefix.length);

function amount(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? String(Number(digits)) : "";
}

export function parseListingText(input: string): ImportedListing {
  const text = input.normalize("NFKC").replace(/\r/g, "");
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const fields: ImportedListing["fields"] = {};
  const features: string[] = [];
  const headline = lines.find((line) => /\b(?:19\d{2}|20\d{2})\s*[-–]?\s+[a-z]/i.test(line));
  if (headline) {
    const segments = headline.split("|").map((segment) => segment.trim());
    const vehiclePart = segments[0]?.match(/\b(19\d{2}|20\d{2})\s*[-–]?\s+(.+)$/i);
    if (vehiclePart) {
      fields.year = vehiclePart[1];
      const name = vehiclePart[2].trim();
      const match = makeMatches.find(({ prefix }) => name.toLowerCase().startsWith(prefix.toLowerCase() + " "));
      if (match) {
        fields.make = match.make;
        fields.model = name.slice(match.prefix.length).trim();
      } else {
        const separator = name.indexOf(" ");
        if (separator > 0) {
          fields.make = name.slice(0, separator);
          fields.model = name.slice(separator + 1).trim();
        }
      }
    }
    for (const candidate of segments.slice(1)) {
      if (!candidate || /^(and more|en meer|meer opties|fully loaded|full option)/i.test(candidate)) continue;
      if (!features.some((feature) => feature.toLowerCase() === candidate.toLowerCase())) features.push(candidate);
    }
  }
  for (const line of lines) {
    const price = line.match(/^prijs\s*[:：]\s*\$?\s*([\d.,]+)/i);
    const cash = line.match(/^(?:giraal deal|cash\s*prijs|cash price)\s*[:：]\s*\$?\s*([\d.,]+)/i);
    if (price) fields.price = amount(price[1]);
    if (cash) fields.cash_price = amount(cash[1]);
    const specification = line.match(/^(stock\s*(?:number|nummer|nr)?|fuel|brandstof|seats|zitplaatsen|transmission|transmissie|body\s*type|carrosserie)\s*[:：]\s*(.+)$/i);
    if (!specification) continue;
    const label = specification[1].toLowerCase().replace(/\s+/g, "");
    const value = specification[2].trim();
    if (label.startsWith("stock")) fields.stock_number = value;
    else if (label === "fuel" || label === "brandstof") fields.fuel_type = value;
    else if (label === "seats" || label === "zitplaatsen") { if (/^\d{1,2}$/.test(value)) fields.seats = value; }
    else if (label === "transmission" || label === "transmissie") fields.transmission = value;
    else fields.body_type = value;
  }
  return { fields, features };
}
