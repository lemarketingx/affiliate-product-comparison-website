import { brandBySlug } from "../lib/dealpilot/brands";

/* Shows the owner-supplied official logo when configured, otherwise the brand
   name set in the site font. */
export function BrandMark({ slug, name, className = "" }: { slug: string; name?: string; className?: string }) {
  const b = brandBySlug(slug);
  const label = name ?? b?.name ?? slug;
  if (b?.logo)
    return <img className={"og-logo-img " + className} src={b.logo} alt={label} loading="lazy" />;
  return (
    <span className={className} dir="ltr">
      {label}
    </span>
  );
}
