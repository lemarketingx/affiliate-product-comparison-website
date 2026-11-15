// DealPilot pre-flight engine: turns an Israeli need into a full buying plan.
// Content is composed from reusable traits (power, wireless, storage...) and
// product types. Every non-trivial claim carries a source or is explicitly
// marked as needing verification; the UI renders that state next to the text.

export type Source = { url: string; title: string; checkedAt: string };

/** A claim either has a source, is stable general knowledge, or needs verification. */
export type Claim =
  | { text: string; source: Source; needsVerification?: false; general?: false }
  | { text: string; general: true; source?: undefined; needsVerification?: false }
  | { text: string; needsVerification: true; source?: Source; general?: false };

export type ItemStatus = "in_box" | "required" | "recommended" | "optional";

export type ManifestItem = {
  id: string;
  /** Short Hebrew name of the component. */
  label: string;
  status: ItemStatus;
  /** Why it matters, in plain Hebrew. */
  why: string;
  /** English AliExpress search phrase for this component, if it is bought separately. */
  search?: string;
  /** Glossary terms (ids) relevant to this component. */
  terms?: string[];
};

export type SearchTerm = { en: string; he: string; note?: string };

export type Effect = {
  /** Items that the buyer already has: shown as "יש לכם". */
  have?: string[];
  /** Items removed from the plan for this answer. */
  hide?: string[];
  /** Items whose status is upgraded to required. */
  require?: string[];
  /** Extra plain-Hebrew advice shown in the plan. */
  note?: string;
  /** Prefer these search terms (by en string) for this answer. */
  search?: string[];
  /** Traits that become active for this answer (e.g. 4G version adds "cellular"). */
  addTraits?: string[];
  /** Answer that means "better buy in Israel" for this case. */
  buyLocal?: boolean;
};

export type Question = {
  id: string;
  text: string;
  hint?: string;
  terms?: string[];
  options: { id: string; label: string; effect?: Effect }[];
};

export type CalculatorId = "storage" | "powerbank";

export type Trait = {
  id: string;
  label: string;
  /** Items this trait usually adds to the manifest. */
  manifest: ManifestItem[];
  /** "Does it fit Israel?" checks. */
  israel: Claim[];
  /** What to look for on the AliExpress product page. */
  pageChecks: string[];
  /** Honest reasons to prefer buying in Israel. */
  buyLocal: Claim[];
  questions?: Question[];
  calculator?: CalculatorId;
};

export type ContentStatus = "draft" | "approved";

export type ProductType = {
  id: string;
  /** Flight-style destination code, e.g. TLV→SEC-01. */
  code: string;
  name: string;
  /** The need, in people's words. */
  need: string;
  group: string;
  /** Hebrew/English words a visitor may type. */
  synonyms: string[];
  /** Words that identify this type in a supplier title (lowercase). */
  detect: string[];
  /** Title words that rule this type out (e.g. "organizer" for cables). */
  exclude?: string[];
  traits: string[];
  manifest: ManifestItem[];
  rules: Claim[];
  search: SearchTerm[];
  pageChecks: string[];
  questions: Question[];
  buyLocal: string;
  /** Extra Israel-fit claims specific to this type. */
  israel?: Claim[];
};
