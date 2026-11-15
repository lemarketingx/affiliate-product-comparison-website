export default function Loading() {
  return (
    <main aria-busy="true" aria-label="טוען מוצרים" className="dp-loading-grid">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="dp-skeleton" />
      ))}
    </main>
  );
}
