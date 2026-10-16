import { siAudi, siBmw, siChevrolet, siFord, siHonda, siHyundai, siJeep, siKia, siMazda, siMitsubishi, siNissan, siSuzuki, siToyota, siVolkswagen, type SimpleIcon } from "simple-icons";

const brandIcons: Record<string, SimpleIcon> = {
  audi: siAudi,
  bmw: siBmw,
  chevrolet: siChevrolet,
  ford: siFord,
  honda: siHonda,
  hyundai: siHyundai,
  jeep: siJeep,
  kia: siKia,
  mazda: siMazda,
  mitsubishi: siMitsubishi,
  nissan: siNissan,
  suzuki: siSuzuki,
  toyota: siToyota,
  volkswagen: siVolkswagen,
};

export function BrandLogo({ make }: { make: string }) {
  const icon = brandIcons[make.trim().toLowerCase()];
  if (!icon) return null;
  return <svg className="brand-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d={icon.path} /></svg>;
}
