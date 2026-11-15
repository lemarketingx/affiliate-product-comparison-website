"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Copy, MessageCircle, PlaneTakeoff, RotateCcw } from "lucide-react";
import type { VisibleType } from "../../lib/preflight";
import { matchNeed } from "../../lib/preflight/match";
import { buildPlan, decodeAnswers, encodeAnswers, questionsFor, type Answers } from "../../lib/preflight/plan";
import type { IsraelPrice } from "../../lib/preflight/israel-prices";
import { Manifest } from "./manifest";
import { SearchTerms } from "./search-terms";
import { Briefing } from "./briefing";
import { Terms } from "./term";
import { StorageCalc } from "./storage-calc";
import { PowerbankCalc } from "./powerbank-calc";
import { CostCalc } from "./cost-calc";
import { DraftBanner } from "./claim";

type View = "pick" | "ask" | "plan";

export function shareText(plan: ReturnType<typeof buildPlan>, url: string) {
  const must = plan.items.filter((i) => i.status === "required" && !i.have);
  const lines = [
    `תוכנית קנייה מ־DealPilot: ${plan.type.name}`,
    "",
    must.length ? "חובה, ולרוב לא בקופסה:" : "",
    ...must.map((i) => "• " + i.label),
    "",
    "מה לחפש באליאקספרס:",
    ...plan.search.slice(0, 4).map((s) => "• " + s.en),
    "",
    "התוכנית המלאה: " + url,
  ];
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

export default function Autopilot({
  types,
  israelPrices,
  initial,
}: {
  types: VisibleType[];
  israelPrices: IsraelPrice[];
  initial: { q?: string; t?: string; a?: string };
}) {
  const initialType = types.find((t) => t.id === initial.t) ?? null;
  const [query, setQuery] = useState(initial.q ?? "");
  const [submitted, setSubmitted] = useState(initial.q ?? "");
  const [typeId, setTypeId] = useState<string | null>(initialType?.id ?? null);
  const [answers, setAnswers] = useState<Answers>(() => decodeAnswers(initial.a));
  const [view, setView] = useState<View>(initialType ? (initial.a !== undefined ? "plan" : "ask") : "pick");
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  const type = types.find((t) => t.id === typeId) ?? null;
  const questions = type ? questionsFor(type, answers) : [];
  const plan = useMemo(() => (type ? buildPlan(type, answers) : null), [type, answers]);
  const matches = useMemo(() => (submitted.trim() ? matchNeed(submitted, types).slice(0, 4) : []), [submitted, types]);
  const groups = useMemo(() => [...new Set(types.map((t) => t.group))], [types]);
  const shareUrl =
    typeof window !== "undefined" && type
      ? `${window.location.origin}/autopilot?t=${type.id}&a=${encodeURIComponent(encodeAnswers(answers))}`
      : "";

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [view, step, typeId]);
  useEffect(() => {
    if (view === "plan" && type)
      window.history.replaceState(null, "", `/autopilot?t=${type.id}&a=${encodeURIComponent(encodeAnswers(answers))}`);
  }, [view, type, answers]);

  function choose(id: string) {
    setTypeId(id);
    setAnswers({});
    setStep(0);
    const t = types.find((x) => x.id === id)!;
    setView(questionsFor(t, {}).length ? "ask" : "plan");
  }
  function answer(qid: string, oid: string) {
    const next = { ...answers, [qid]: oid };
    setAnswers(next);
    const qs = questionsFor(type!, next);
    if (step + 1 >= qs.length) setView("plan");
    else setStep(step + 1);
  }
  function reset() {
    setTypeId(null); setAnswers({}); setStep(0); setView("pick"); setQuery(""); setSubmitted("");
    window.history.replaceState(null, "", "/autopilot");
  }

  if (!types.length)
    return (
      <div className="fp-ap fp-ap-empty">
        <h2 ref={heading} tabIndex={-1}>הטייס האוטומטי בדרך</h2>
        <p>היעדים עוברים בדיקה אחרונה לפני פרסום. בינתיים אפשר לקרוא את <Link href="/guides">מדריכי &quot;קונים חכם מחו״ל&quot;</Link>.</p>
      </div>
    );

  return (
    <div className="fp-ap">
      <div className="fp-ap-bar" aria-hidden="true">
        <span>AUTOPILOT</span>
        <span>{type ? "TLV→" + type.code : "TLV→---"}</span>
        <span>{view === "pick" ? "יעד" : view === "ask" ? `שאלה ${step + 1}/${questions.length}` : "מוכן להמראה"}</span>
      </div>

      {view === "pick" && (
        <div className="fp-ap-screen">
          <h2 ref={heading} tabIndex={-1}>מה אתם צריכים?</h2>
          <p className="fp-ap-sub">כתבו במילים שלכם, למשל &quot;מצלמה לחצר בלי חשמל&quot; או &quot;מטען מהיר לאייפון&quot;.</p>
          <form className="fp-ap-ask" role="search" onSubmit={(e) => { e.preventDefault(); setSubmitted(query); }}>
            <label className="fp-sr" htmlFor="ap-q">תיאור הצורך</label>
            <input id="ap-q" value={query} maxLength={120} onChange={(e) => setQuery(e.target.value)} placeholder="אני רוצה..." autoComplete="off" />
            <button className="fp-btn" type="submit">מצאו לי יעד <ArrowLeft size={18} aria-hidden="true" /></button>
          </form>
          {submitted.trim() && (
            <div className="fp-ap-matches" role="status" aria-live="polite">
              {matches.length ? (
                <>
                  <p>{matches.length === 1 ? "מצאנו יעד מתאים:" : "אולי התכוונתם לאחד מאלה:"}</p>
                  <ul>
                    {matches.map((m) => (
                      <li key={m.type.id}>
                        <button type="button" className="fp-ap-dest" onClick={() => choose(m.type.id)}>
                          <span dir="ltr">TLV→{m.type.code}</span>
                          <strong>{m.type.name}</strong>
                          <small>{m.type.need}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>לא זיהינו יעד מתאים לתיאור הזה. בחרו מהרשימה למטה, או נסו מילים אחרות.</p>
              )}
            </div>
          )}
          <div className="fp-ap-groups">
            {groups.map((g) => (
              <fieldset key={g}>
                <legend>{g}</legend>
                {types.filter((t) => t.group === g).map((t) => (
                  <button key={t.id} type="button" className="fp-ap-chip" onClick={() => choose(t.id)}>
                    {t.name}
                  </button>
                ))}
              </fieldset>
            ))}
          </div>
        </div>
      )}

      {view === "ask" && type && questions[step] && (
        <div className="fp-ap-screen">
          <p className="fp-ap-sub" dir="rtl"><span dir="ltr">TLV→{type.code}</span> · {type.name}</p>
          <div className="fp-ap-progress" aria-hidden="true"><i style={{ width: ((step + 1) / (questions.length + 1)) * 100 + "%" }} /></div>
          <fieldset className="fp-ap-q">
            <legend><h2 ref={heading} tabIndex={-1}>{questions[step].text}</h2></legend>
            {questions[step].hint && <p className="fp-ap-sub">{questions[step].hint}</p>}
            <div className="fp-ap-options">
              {questions[step].options.map((o) => (
                <button key={o.id} type="button" className={"fp-ap-opt" + (answers[questions[step].id] === o.id ? " is-on" : "")} aria-pressed={answers[questions[step].id] === o.id} onClick={() => answer(questions[step].id, o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
          {questions[step].terms && (
            <aside className="fp-ap-aside" aria-label="הסבר מונחים"><span>מונחים בשאלה הזו:</span><Terms ids={questions[step].terms!} /></aside>
          )}
          <div className="fp-ap-nav">
            <button type="button" className="fp-btn fp-btn-ghost fp-btn-sm" onClick={() => (step ? setStep(step - 1) : setView("pick"))}>
              <ArrowRight size={16} aria-hidden="true" /> הקודם
            </button>
            <button type="button" className="fp-btn fp-btn-ghost fp-btn-sm" onClick={() => (step + 1 >= questions.length ? setView("plan") : setStep(step + 1))}>
              דילוג
            </button>
          </div>
        </div>
      )}

      {view === "plan" && plan && type && (
        <div className="fp-ap-plan">
          <header className="fp-ap-pass">
            <div>
              <span className="fp-kicker fp-kicker-light">כרטיס טיסה אישי</span>
              <h2 ref={heading} tabIndex={-1}>{type.name}</h2>
              <p>{type.need}</p>
            </div>
            <dl>
              <div><dt>יעד</dt><dd dir="ltr">TLV→{type.code}</dd></div>
              <div><dt>חובה שלא בקופסה</dt><dd dir="ltr">{plan.items.filter((i) => i.status === "required" && !i.have).length}</dd></div>
              <div><dt>בדיקות</dt><dd dir="ltr">{plan.pageChecks.length}</dd></div>
            </dl>
          </header>
          <DraftBanner status={type.status} />
          {plan.notes.length > 0 && (
            <ul className="fp-ap-notes" aria-label="הערות לפי התשובות שלכם">
              {plan.notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
          <Manifest items={plan.items} code={type.code} title="מה צריך לקנות, ומה כבר יש" />
          <SearchTerms terms={plan.search} />
          {plan.calculators.includes("storage") && <StorageCalc media={type.id === "security-recorder" ? "hdd" : "sd"} />}
          {plan.calculators.includes("powerbank") || type.id === "powerbank" ? <PowerbankCalc /> : null}
          <Briefing plan={plan} />
          <CostCalc
            apiPriceILS={null}
            accessories={plan.items.filter((i) => i.status === "required" && !i.have && i.search).map((i) => i.label)}
            israelPrices={israelPrices.filter((p) => p.typeId === type.id)}
          />
          <div className="fp-ap-share">
            <h3>שמרו או שתפו את התוכנית</h3>
            <p className="fp-fine">התוכנית נשמרת רק בקישור עצמו. אנחנו לא שומרים אותה ולא שום פרט אישי.</p>
            <div className="fp-actions">
              <button
                type="button"
                className="fp-btn"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(shareText(plan, shareUrl)); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); }
                }}
              >
                <Copy size={17} aria-hidden="true" /> העתקת הרשימה
              </button>
              <a className="fp-btn fp-btn-ghost" href={"https://wa.me/?text=" + encodeURIComponent(shareText(plan, shareUrl))} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={17} aria-hidden="true" /> שליחה בוואטסאפ
              </a>
              <Link className="fp-btn fp-btn-ghost" href={"/missions/" + type.id}>לדף היעד המלא</Link>
              <button type="button" className="fp-btn fp-btn-ghost" onClick={reset}><RotateCcw size={17} aria-hidden="true" /> יעד חדש</button>
            </div>
            <p className="fp-fine" role="status">{copied ? "הרשימה הועתקה." : ""}</p>
          </div>
          <p className="fp-ap-ready"><PlaneTakeoff size={18} aria-hidden="true" /> מוכנים לבדוק מוצרים. ההחלטה שלכם.</p>
        </div>
      )}
    </div>
  );
}
