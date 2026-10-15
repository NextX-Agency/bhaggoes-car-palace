"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Check, ImagePlus, LoaderCircle } from "lucide-react";
import type { SiteSettings } from "@/lib/domain";
import { saveSettingsAction } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/browser";

export function AdminSettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, {}); const [logoPath, setLogoPath] = useState(settings.logo_path ?? ""); const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? ""); const [uploading, setUploading] = useState(false); const [uploadError, setUploadError] = useState("");
  const [hours] = [Object.entries(settings.business_hours ?? {}).map(([day, time]) => `${day}: ${time}`).join("\n")];
  async function uploadLogo(file?: File) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || file.size > 5 * 1024 * 1024) { setUploadError("Choose a JPEG, PNG, WebP, or AVIF image under 5 MB."); return; }
    setUploading(true); setUploadError("");
    try {
      const client = createClient(); const extension = file.type.split("/")[1].replace("jpeg", "jpg"); const path = `brand/${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from("site-assets").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setLogoPath(path); setLogoUrl(URL.createObjectURL(file));
    } catch { setUploadError("Logo upload failed. Check the Supabase Storage connection."); }
    finally { setUploading(false); }
  }
  return <form className="admin-form" action={action}>
    <section className="admin-form-section"><h2>Brand and contact details</h2><div className="admin-form-grid"><label className="admin-field span-2">Business name<input name="business_name" defaultValue={settings.business_name} required /></label><label className="admin-field">Currency<input name="currency" defaultValue={settings.currency ?? ""} placeholder="SRD, USD…" /></label><label className="admin-field span-all">Slogan<input name="slogan" defaultValue={settings.slogan} /></label><label className="admin-field">Phone<input name="phone" defaultValue={settings.phone ?? ""} /></label><label className="admin-field">WhatsApp number<input name="whatsapp" defaultValue={settings.whatsapp ?? ""} placeholder="Country code + number" /></label><label className="admin-field">Email<input name="email" type="email" defaultValue={settings.email ?? ""} /></label><label className="admin-field span-all">Locations <span className="help-text">One per line, such as Showroom: street, city.</span><textarea name="address" rows={3} defaultValue={settings.address ?? ""} /></label><label className="admin-field span-all">Business hours <span className="help-text">One per line, such as Monday-Friday: 9:00 AM - 5:00 PM.</span><textarea name="business_hours" rows={4} defaultValue={hours} /></label></div></section>
    <section className="admin-form-section"><h2>Homepage and About</h2><div className="admin-form-grid"><label className="admin-field span-all">Homepage heading<input name="homepage_title" defaultValue={settings.homepage_title} /></label><label className="admin-field span-all">Supporting text (optional)<input name="homepage_subtitle" defaultValue={settings.homepage_subtitle} /></label><label className="admin-field span-all">About the dealership<textarea name="about_text" rows={6} defaultValue={settings.about_text ?? ""} /></label></div></section>
    <section className="admin-form-section"><h2>Search and sharing preview</h2><div className="admin-form-grid"><label className="admin-field span-all">Page title<input name="seo_title" maxLength={120} defaultValue={settings.seo_title} required /><span className="help-text">Used as the default browser title and social sharing title.</span></label><label className="admin-field span-all">Page description<textarea name="seo_description" maxLength={320} rows={3} defaultValue={settings.seo_description} required /><span className="help-text">A short summary for search results and shared links.</span></label></div></section>
    <section className="admin-form-section"><h2>Logo</h2><div className="admin-form-grid"><input type="hidden" name="logo_path" value={logoPath} /><div className="logo-settings-preview">{logoUrl ? <Image src={logoUrl} alt="Current business logo" width={190} height={80} unoptimized /> : <Image src="/images/bhaggoes-logo-approved.png" alt="Bhaggoes Car Palace logo" width={190} height={80} />}</div><div className="drop-zone logo-drop"><ImagePlus size={20} aria-hidden="true" /><label className="photo-file-picker">{logoPath ? "Replace logo" : "Upload a logo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void uploadLogo(event.target.files?.[0])} disabled={uploading} /></label><p>JPEG, PNG, WebP or AVIF, up to 5 MB</p></div>{uploadError ? <p className="admin-error" role="alert">{uploadError}</p> : null}{uploading ? <p className="admin-feedback"><LoaderCircle size={14} /> Uploading…</p> : null}</div></section>
    <section className="admin-form-section"><h2>Financing and inventory display</h2><div className="admin-checkbox-row"><label className="admin-checkbox"><input name="financing_enabled" type="checkbox" defaultChecked={settings.financing_enabled} />Show financing information on the website</label><label className="admin-checkbox"><input name="show_sold" type="checkbox" defaultChecked={settings.show_sold} />Show sold listings on the public website</label></div><label className="admin-field" style={{ marginTop: 16 }}>Financing notes<textarea name="financing_notes" rows={4} defaultValue={settings.financing_notes ?? ""} /></label></section>
    <section className="admin-form-section"><h2>Social links</h2><div className="admin-form-grid">{["instagram", "facebook", "youtube", "tiktok"].map((platform) => <label className="admin-field" key={platform}>{platform[0].toUpperCase() + platform.slice(1)}<input name={platform} type="url" defaultValue={settings.social_links?.[platform] ?? ""} placeholder="https://" /></label>)}</div></section>
    <div className="admin-form-footer"><div>{state.error ? <p className="admin-feedback admin-error" role="alert">{state.error}</p> : state.ok ? <p className="admin-feedback" role="status"><Check size={14} /> Website details saved.</p> : null}</div><button className="button button-primary" type="submit" disabled={pending || uploading}>{pending ? "Saving…" : "Save website settings"}</button></div>
  </form>;
}
