"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, LoaderCircle } from "lucide-react";
import type { SiteSettings } from "@/lib/domain";
import { saveSettingsAction } from "@/app/admin/actions";
import { keepFormValues } from "@/components/admin-submit";
import { createClient } from "@/lib/supabase/browser";
import { SocialIcon, type SocialPlatform } from "@/components/social-icon";

const socialLabels: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok" };

export function AdminSettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, {}); const [logoPath, setLogoPath] = useState(settings.logo_path ?? ""); const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? ""); const [uploading, setUploading] = useState(false); const [uploadError, setUploadError] = useState(""); const [uploaded, setUploaded] = useState(false);
  const hours = Object.entries(settings.business_hours ?? {}).map(([day, time]) => `${day}: ${time}`).join("\n");
  const previewUrl = useRef<string | null>(null);
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);
  async function uploadLogo(file?: File) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || file.size > 5 * 1024 * 1024) { setUploadError("Kies een JPEG-, PNG-, WebP- of AVIF-afbeelding van maximaal 5 MB."); return; }
    setUploading(true); setUploadError(""); setUploaded(false);
    try {
      const client = createClient(); const extension = file.type.split("/")[1].replace("jpeg", "jpg"); const path = `brand/${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from("site-assets").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = URL.createObjectURL(file);
      setLogoPath(path); setLogoUrl(previewUrl.current); setUploaded(true);
    } catch { setUploadError("Het uploaden van het logo is mislukt. Controleer de verbinding met Supabase Storage."); }
    finally { setUploading(false); }
  }
  return <form className="admin-form" onSubmit={keepFormValues(action)}>
    <section className="admin-form-section"><h2>Bedrijfs- en contactgegevens</h2><div className="admin-form-grid"><label className="admin-field span-2">Bedrijfsnaam<input name="business_name" defaultValue={settings.business_name} required minLength={2} maxLength={120} /></label><label className="admin-field">Valuta<input name="currency" defaultValue={settings.currency ?? ""} maxLength={8} placeholder="SRD, USD…" autoCapitalize="characters" /></label><label className="admin-field span-all">Slogan<input name="slogan" defaultValue={settings.slogan} maxLength={180} /></label><label className="admin-field">Telefoon<input name="phone" type="tel" inputMode="tel" autoComplete="off" maxLength={40} defaultValue={settings.phone ?? ""} /></label><label className="admin-field">WhatsApp-nummer<input name="whatsapp" type="tel" inputMode="tel" autoComplete="off" maxLength={40} defaultValue={settings.whatsapp ?? ""} placeholder="Landnummer + nummer" /></label><label className="admin-field">E-mailadres<input name="email" type="email" autoComplete="off" autoCapitalize="none" maxLength={254} defaultValue={settings.email ?? ""} /></label><label className="admin-field span-all">Locaties <span className="help-text">Eén per regel, bijvoorbeeld Showroom: straat, plaats.</span><textarea name="address" rows={3} maxLength={1500} defaultValue={settings.address ?? ""} /></label><label className="admin-field span-all">Openingstijden <span className="help-text">Eén per regel, bijvoorbeeld Maandag-vrijdag: 9:00 - 17:00.</span><textarea name="business_hours" rows={4} defaultValue={hours} /></label></div></section>
    <section className="admin-form-section shared-sales-settings" aria-labelledby="shared-sales-heading"><h2 id="shared-sales-heading">Standaard op elke auto</h2><p className="help-text">Wijzig deze verkoopinformatie één keer. Elke huidige en nieuwe voertuigpagina en de financieringspagina gebruiken direct dezelfde voorwaarden.</p>
      <div className="admin-form-grid">
        <label className="admin-field span-all">Wat krijgt de klant bij aankoop? <span className="help-text">Eén voordeel per regel. Leeg laten verbergt dit onderdeel.</span><textarea name="benefits" rows={7} maxLength={2500} defaultValue={settings.sales_terms.benefits.join("\n")} /></label>
        <label className="admin-field">Intern: aanbetaling (%)<input name="internal_down_percent" type="number" inputMode="numeric" min="0" max="100" step="1" required defaultValue={settings.sales_terms.internal_down_percent} /></label>
        <label className="admin-field">Intern: maximaal aantal maanden<input name="internal_max_months" type="number" inputMode="numeric" min="1" max="120" step="1" required defaultValue={settings.sales_terms.internal_max_months} /></label>
        <label className="admin-field">Bank: vanaf aanbetaling (%)<input name="bank_down_percent" type="number" inputMode="numeric" min="0" max="100" step="1" required defaultValue={settings.sales_terms.bank_down_percent} /></label>
        <label className="admin-checkbox span-all"><input name="trade_in" type="checkbox" defaultChecked={settings.sales_terms.trade_in} /><span><strong>Inruil mogelijk</strong><small>Verschijnt op voertuigpagina’s en financieringspagina</small></span></label>
        <label className="admin-field span-all">Actietekst (optioneel)<input name="promo_text" maxLength={300} defaultValue={settings.sales_terms.promo_text} placeholder="Neem vandaag contact op voor extra korting." /></label>
        <label className="admin-field span-all">Extra financieringsnotitie (optioneel)<textarea name="financing_notes" rows={3} maxLength={2000} defaultValue={settings.financing_notes ?? ""} placeholder="Alleen voor informatie die niet al hierboven staat" /></label>
      </div>
      <div className="admin-checkbox-row"><label className="admin-checkbox"><input name="financing_enabled" type="checkbox" defaultChecked={settings.financing_enabled} />Toon financieringsvoorwaarden op de website</label></div>
    </section>
    <section className="admin-form-section"><h2>Homepage en over ons</h2><div className="admin-form-grid"><label className="admin-field span-all">Titel van de homepage<input name="homepage_title" defaultValue={settings.homepage_title} required minLength={2} maxLength={180} /></label><label className="admin-field span-all">Ondersteunende tekst (optioneel)<input name="homepage_subtitle" maxLength={350} defaultValue={settings.homepage_subtitle} /></label><label className="admin-field span-all">Over het bedrijf<textarea name="about_text" rows={6} maxLength={10000} defaultValue={settings.about_text ?? ""} /></label></div></section>
    <section className="admin-form-section"><h2>Zoeken en delen</h2><div className="admin-form-grid"><label className="admin-field span-all">Paginatitel<input name="seo_title" maxLength={120} defaultValue={settings.seo_title} required /><span className="help-text">Standaardtitel in de browser en bij het delen van links.</span></label><label className="admin-field span-all">Paginabeschrijving<textarea name="seo_description" maxLength={320} rows={3} defaultValue={settings.seo_description} required /><span className="help-text">Een korte samenvatting voor zoekresultaten en gedeelde links.</span></label></div></section>
    <section className="admin-form-section"><h2>Logo</h2><div className="admin-form-grid"><input type="hidden" name="logo_path" value={logoPath} /><div className="logo-settings-preview">{logoUrl ? <Image src={logoUrl} alt="Huidig logo" width={190} height={80} unoptimized /> : <Image src="/images/bhaggoes-logo-approved.png" alt="Logo van Bhaggoes Car Palace" width={190} height={80} />}</div><div className="drop-zone logo-drop"><ImagePlus size={20} aria-hidden="true" /><label className="photo-file-picker">{logoPath ? "Logo vervangen" : "Logo uploaden"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { void uploadLogo(event.target.files?.[0]); event.target.value = ""; }} disabled={uploading} /></label><p>JPEG, PNG, WebP of AVIF, maximaal 5 MB</p></div>{uploadError ? <p className="admin-error" role="alert">{uploadError}</p> : null}{uploading ? <p className="admin-feedback" role="status"><LoaderCircle className="spin" size={14} aria-hidden="true" /> Uploaden…</p> : uploaded ? <p className="admin-feedback" role="status"><Check size={14} aria-hidden="true" /> Logo geüpload. Sla de instellingen op om het te gebruiken.</p> : null}</div></section>
    <section className="admin-form-section"><h2>Voorraadweergave</h2><label className="admin-checkbox"><input name="show_sold" type="checkbox" defaultChecked={settings.show_sold} />Toon verkochte auto’s op de website</label></section>
    <section className="admin-form-section"><h2>Social media</h2><div className="admin-form-grid">{(["instagram", "facebook", "youtube", "tiktok"] as SocialPlatform[]).map((platform) => <label className="admin-field" key={platform}><span className="social-field-label"><SocialIcon platform={platform} />{socialLabels[platform]}</span><input name={platform} type="url" inputMode="url" autoCapitalize="none" autoComplete="off" defaultValue={settings.social_links?.[platform] ?? ""} placeholder="https://" /></label>)}</div></section>
    <div className="admin-form-footer"><div>{state.error ? <p className="admin-feedback admin-error" role="alert">{state.error}</p> : state.ok ? <p className="admin-feedback" role="status"><Check size={14} aria-hidden="true" /> Website-instellingen opgeslagen.</p> : null}</div><button className="button button-primary" type="submit" disabled={pending || uploading}>{pending ? "Opslaan…" : "Website-instellingen opslaan"}</button></div>
  </form>;
}
