/* Shared visual pieces of the "pre-flight" storefront language. */
export function gateCode(index: number) {
  return String.fromCharCode(65 + Math.floor(index / 2)) + (index + 1);
}

export function flightCode(id: string) {
  return "DP-" + id.slice(-4);
}

/* Decorative barcode derived from the product id; carries no data meaning. */
export function Barcode({ seed }: { seed: string }) {
  const digits = (seed.replace(/\D/g, "") || "0").padEnd(18, "7").slice(0, 18);
  return (
    <span className="fp-barcode" aria-hidden="true">
      {digits.split("").map((d, i) => (
        <i
          key={i}
          style={{ width: 1 + (Number(d) % 3) + "px", marginInlineEnd: 1 + ((Number(d) + i) % 2) + "px" }}
        />
      ))}
    </span>
  );
}

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      className="fp-mark"
    >
      <path
        d="M6 4h28a2 2 0 0 1 2 2v9a5 5 0 0 0 0 10v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a5 5 0 0 0 0-10V6a2 2 0 0 1 2-2z"
        fill="currentColor"
      />
      <path
        d="M11.5 22.6 27.6 13c1-.6 2.3.4 1.9 1.5l-1.1 3.1-6.3 3.4 4.6 1.6-1.4 1.6-6.7-.6-3.2 2.1-1.6-.8 1.6-2.4z"
        fill="var(--fp-paper, #F2EEE4)"
      />
    </svg>
  );
}
