// Owner-maintained official materials. Nothing here is fetched or invented.
//
// PORTAL_BANNERS: official creatives downloaded by the owner from AliExpress
// Portals (there is no API that returns banner images). Put the unmodified
// image file in public/banners/ and copy title, landing page and dates exactly
// as Portals shows them. The site never crops, overlays or edits the image.
export type PortalBanner = {
  id: string; // slug, e.g. "11-11-global-sale"
  title: string; // verbatim from Portals
  imagePath: string; // "/banners/<file>.jpg|png|webp", unmodified official file
  imageWidth: number;
  imageHeight: number;
  landingUrl: string; // the AliExpress campaign page from Portals (https://...aliexpress.com/...)
  startsAt: string; // ISO date-time, as stated in Portals
  endsAt: string; // ISO date-time, as stated in Portals
  addedAt: string; // YYYY-MM-DD
};
export const PORTAL_BANNERS: PortalBanner[] = [];

// Commission attribution can only be confirmed in AliExpress Portals reports
// (clicks/orders appearing under ALIEXPRESS_TRACKING_ID). Until the owner has
// checked that and filled this in, banners are labelled "ייחוס טרם אומת".
export const ATTRIBUTION: { confirmed: boolean; checkedAt: string | null; how: string | null } = {
  confirmed: false,
  checkedAt: null,
  how: null,
};

const ALI = ["aliexpress.com", "aliexpress.us"];
export function validPortalBanner(b: PortalBanner): string | null {
  if (!/^[a-z0-9-]{3,60}$/.test(b.id)) return "מזהה לא תקין";
  if (!b.title.trim() || b.title.length > 160) return "כותרת חסרה";
  if (!/^\/banners\/[\w.-]+\.(jpe?g|png|webp)$/i.test(b.imagePath)) return "נתיב תמונה חייב להיות תחת /banners/";
  if (!(b.imageWidth > 0 && b.imageHeight > 0)) return "חסרות מידות תמונה";
  try {
    const u = new URL(b.landingUrl);
    if (u.protocol !== "https:" || !ALI.some((d) => u.hostname === d || u.hostname.endsWith("." + d))) return "דף נחיתה חייב להיות ב־AliExpress";
  } catch {
    return "דף נחיתה לא תקין";
  }
  if (!Number.isFinite(Date.parse(b.startsAt)) || !Number.isFinite(Date.parse(b.endsAt))) return "חסרים תאריכי פעילות";
  if (Date.parse(b.endsAt) <= Date.parse(b.startsAt)) return "תאריך הסיום לפני ההתחלה";
  return null;
}

export function maskTrackingId(id: string | null): string | null {
  if (!id) return null;
  return id.length <= 4 ? "****" : id.slice(0, 2) + "*".repeat(Math.max(2, id.length - 4)) + id.slice(-2);
}
