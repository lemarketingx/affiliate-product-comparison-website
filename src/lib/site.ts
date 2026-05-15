export const siteConfig = {
  name: "Affiliate Compare",
  tagline: "Structured comparisons without API coupling.",
  description:
    "A clean, scalable foundation for affiliate deals, product comparisons, categories, blog content, and admin workflows.",
};

export const navItems = [
  { href: "/", label: "Home" },
  { href: "/deals", label: "Deals" },
  { href: "/blog", label: "Blog" },
  { href: "/admin", label: "Admin" },
] as const;

export const architectureCards = [
  {
    title: "Routing foundation",
    description:
      "Public, dynamic, blog, and admin routes are ready for future data sources.",
  },
  {
    title: "Reusable UI shell",
    description:
      "Shared header, footer, containers, hero, and empty states keep screens consistent.",
  },
  {
    title: "RTL/LTR ready",
    description:
      "Logical spacing, document direction support, and copy-safe layout primitives are in place.",
  },
] as const;
