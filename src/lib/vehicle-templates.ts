export const templateFieldNames = [
  "make", "model", "variant", "engine_capacity", "fuel_type",
  "transmission", "drive_type", "body_type", "exterior_color",
  "interior_color", "seats", "doors", "condition",
] as const;

export type TemplateFieldName = (typeof templateFieldNames)[number];
export type VehicleTemplateFields = Partial<Record<TemplateFieldName, string>> & { features: string[] };

export interface VehicleTemplate {
  id: string;
  name: string;
  fields: VehicleTemplateFields;
}

export function listingTitle(year: string, make: string, model: string, variant: string) {
  return [year, make, model, variant].map((part) => part.trim()).filter(Boolean).join(" ");
}
