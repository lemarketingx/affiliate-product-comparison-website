import type { Claim, Effect, ManifestItem, ProductType, Question, SearchTerm, Trait, CalculatorId } from "./types.ts";
import { TRAITS } from "./traits.ts";

export type Answers = Record<string, string>;
export type PlanItem = ManifestItem & { have: boolean };
export type Plan = {
  type: ProductType;
  traits: Trait[];
  items: PlanItem[];
  notes: string[];
  search: SearchTerm[];
  pageChecks: string[];
  israel: Claim[];
  rules: Claim[];
  buyLocal: { text: string; claims: Claim[]; flagged: boolean };
  calculators: CalculatorId[];
  terms: string[];
};

function effects(type: ProductType, answers: Answers, traits: Trait[]): Effect[] {
  const qs = [...type.questions, ...traits.flatMap((t) => t.questions ?? [])];
  return qs.flatMap((q) => {
    const opt = q.options.find((o) => o.id === answers[q.id]);
    return opt?.effect ? [opt.effect] : [];
  });
}

/** Traits of the type plus any added by answers (fixed point, max a few rounds). */
export function activeTraits(type: ProductType, answers: Answers): Trait[] {
  let ids = new Set(type.traits);
  for (let round = 0; round < 3; round++) {
    const traits = [...ids].map((id) => TRAITS[id]).filter(Boolean);
    const added = effects(type, answers, traits).flatMap((e) => e.addTraits ?? []);
    const next = new Set([...ids, ...added]);
    if (next.size === ids.size) return traits;
    ids = next;
  }
  return [...ids].map((id) => TRAITS[id]).filter(Boolean);
}

/** Questions for the wizard, in order, given answers so far. */
export function questionsFor(type: ProductType, answers: Answers): Question[] {
  const seen = new Set<string>();
  return [...type.questions, ...activeTraits(type, answers).flatMap((t) => t.questions ?? [])].filter(
    (q) => !seen.has(q.id) && (seen.add(q.id), true),
  );
}

export function buildPlan(type: ProductType, answers: Answers = {}): Plan {
  const traits = activeTraits(type, answers);
  const fx = effects(type, answers, traits);
  const hide = new Set(fx.flatMap((e) => e.hide ?? []));
  const have = new Set(fx.flatMap((e) => e.have ?? []));
  const require = new Set(fx.flatMap((e) => e.require ?? []));
  const byId = new Map<string, ManifestItem>();
  for (const item of [...type.manifest, ...traits.flatMap((t) => t.manifest)])
    if (!byId.has(item.id)) byId.set(item.id, item);
  const order = { required: 0, in_box: 1, recommended: 2, optional: 3 } as const;
  const items = [...byId.values()]
    .filter((i) => !hide.has(i.id))
    .map((i) => ({ ...i, status: require.has(i.id) && i.status !== "in_box" ? ("required" as const) : i.status, have: have.has(i.id) }))
    .sort((a, b) => order[a.status] - order[b.status]);
  const preferred = fx.flatMap((e) => e.search ?? []);
  const search = [...type.search].sort(
    (a, b) => Number(preferred.includes(b.en)) - Number(preferred.includes(a.en)),
  );
  const accessorySearch = items
    .filter((i) => i.search && !i.have && i.status !== "in_box")
    .map((i) => ({ he: i.label, en: i.search! }));
  const terms = [...new Set(items.flatMap((i) => i.terms ?? []))];
  const traitBuyLocal = traits.flatMap((t) => t.buyLocal);
  return {
    type,
    traits,
    items,
    notes: fx.flatMap((e) => (e.note ? [e.note] : [])),
    search: [...search, ...accessorySearch.filter((a) => !search.some((s) => s.en === a.en))],
    pageChecks: [...type.pageChecks, ...traits.flatMap((t) => t.pageChecks)],
    israel: [...(type.israel ?? []), ...traits.flatMap((t) => t.israel)],
    rules: type.rules,
    buyLocal: {
      text: type.buyLocal,
      claims: traitBuyLocal,
      flagged: fx.some((e) => e.buyLocal) || traits.some((t) => t.id === "safety"),
    },
    calculators: [...new Set(traits.flatMap((t) => (t.calculator ? [t.calculator] : [])))],
    terms,
  };
}

/** Answers <-> compact URL form "cams:5-8,wiring:none" so a plan can be shared without a server. */
export function encodeAnswers(a: Answers): string {
  return Object.entries(a)
    .filter(([k, v]) => /^[\w-]{1,24}$/.test(k) && /^[\w+-]{1,24}$/.test(v))
    .map(([k, v]) => k + ":" + v)
    .join(",");
}
export function decodeAnswers(raw: string | null | undefined): Answers {
  const out: Answers = {};
  for (const pair of (raw ?? "").slice(0, 400).split(",")) {
    const [k, v] = pair.split(":");
    if (k && v && /^[\w-]{1,24}$/.test(k) && /^[\w+-]{1,24}$/.test(v)) out[k] = v;
  }
  return out;
}
