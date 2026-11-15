import type { Claim } from "../../lib/preflight/types";

const date = (d: string) => new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeZone: "Asia/Jerusalem" }).format(new Date(d + "T12:00:00Z"));

/** Renders a claim with its evidence state. Unverified text is never shown as fact. */
export function ClaimText({ claim }: { claim: Claim }) {
  return (
    <span className="fp-claim">
      <span>{claim.text}</span>{" "}
      {claim.needsVerification && <span className="fp-chip is-wait fp-claim-tag">נדרש אימות</span>}
      {claim.source && (
        <a className="fp-claim-src" href={claim.source.url} target="_blank" rel="noopener noreferrer">
          מקור: {claim.source.title} · נבדק {date(claim.source.checkedAt)}
        </a>
      )}
    </span>
  );
}

export function ClaimList({ claims, className = "" }: { claims: Claim[]; className?: string }) {
  if (!claims.length) return null;
  return (
    <ul className={"fp-claims " + className}>
      {claims.map((c, i) => (
        <li key={i} className={c.needsVerification ? "is-wait" : c.source ? "is-src" : ""}>
          <ClaimText claim={c} />
        </li>
      ))}
    </ul>
  );
}

export function DraftBanner({ status }: { status: "approved" | "draft" }) {
  if (status === "approved") return null;
  return (
    <p className="fp-draft" role="note">
      טיוטה · התוכן ממתין לאישור בעל האתר ואינו מוצג לציבור
    </p>
  );
}
