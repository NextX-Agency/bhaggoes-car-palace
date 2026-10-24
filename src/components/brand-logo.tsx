import Image from "next/image";
import {
  siAcura, siAstonmartin, siAudi, siBentley, siBmw, siCadillac, siChevrolet,
  siChrysler, siCitroen, siFerrari, siFiat, siFord, siHonda, siHyundai,
  siInfiniti, siJeep, siKia, siMahindra, siMazda, siMini, siMitsubishi,
  siNissan, siOpel, siPeugeot, siPolestar, siPorsche, siProton, siRam,
  siRenault, siSeat, siSkoda, siSubaru, siSuzuki, siTata, siTesla,
  siToyota, siVolkswagen, siVolvo, type SimpleIcon,
} from "simple-icons";

const brandIcons: Record<string, SimpleIcon> = {
  acura: siAcura,
  astonmartin: siAstonmartin,
  audi: siAudi,
  bentley: siBentley,
  bmw: siBmw,
  cadillac: siCadillac,
  chevrolet: siChevrolet,
  chrysler: siChrysler,
  citroen: siCitroen,
  ferrari: siFerrari,
  fiat: siFiat,
  ford: siFord,
  honda: siHonda,
  hyundai: siHyundai,
  infiniti: siInfiniti,
  jeep: siJeep,
  kia: siKia,
  mahindra: siMahindra,
  mazda: siMazda,
  mini: siMini,
  mitsubishi: siMitsubishi,
  nissan: siNissan,
  opel: siOpel,
  peugeot: siPeugeot,
  polestar: siPolestar,
  porsche: siPorsche,
  proton: siProton,
  ram: siRam,
  renault: siRenault,
  seat: siSeat,
  skoda: siSkoda,
  subaru: siSubaru,
  suzuki: siSuzuki,
  tata: siTata,
  tesla: siTesla,
  toyota: siToyota,
  volkswagen: siVolkswagen,
  volvo: siVolvo,
};

const localBrandIcons: Record<string, string> = {
  alfaromeo: "/brands/alfa-romeo-alt.svg",
  dacia: "/brands/dacia.svg",
  dongfeng: "/brands/dongfeng.svg",
  gmc: "/brands/gmc.svg",
  jaguar: "/brands/jaguar.svg",
  landrover: "/brands/land-rover.svg",
  lexus: "/brands/lexus.svg",
  maserati: "/brands/maserati.svg",
  mercedesbenz: "/brands/mercedes-benz.svg",
};

export function BrandLogo({ make }: { make: string }) {
  const normalized = make.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!normalized) return null;
  const key = normalized.replace(/[^a-z0-9]/g, "");
  const localIcon = localBrandIcons[key];
  if (localIcon) return <Image className="brand-logo" src={localIcon} alt="" aria-hidden="true" width={20} height={20} unoptimized />;
  const icon = brandIcons[key];
  if (!icon) {
    const initials = make.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    return <span className="brand-logo brand-logo-fallback" aria-hidden="true">{initials}</span>;
  }
  return <svg className="brand-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d={icon.path} /></svg>;
}
