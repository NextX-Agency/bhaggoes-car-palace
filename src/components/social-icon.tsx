import { siFacebook, siInstagram, siTiktok, siWhatsapp, siYoutube } from "simple-icons";

const icons = { facebook: siFacebook, instagram: siInstagram, tiktok: siTiktok, whatsapp: siWhatsapp, youtube: siYoutube };

export type SocialPlatform = keyof typeof icons;

export function SocialIcon({ platform, size = 18 }: { platform: SocialPlatform; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d={icons[platform].path} /></svg>;
}
