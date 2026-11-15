"use client";
/** Sort control: submits its form on change; the form's button covers no-JS. */
export default function SortSelect({ name, value, options }: { name: string; value: string; options: { key: string; label: string }[] }) {
  return (
    <select
      name={name}
      defaultValue={value}
      aria-label="סדר מוצרים"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}
