/* Shown while a page streams in: the shape of the catalog, not a spinner. */
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="טוען מוצרים" className="bl-loading">
      <div className="bl-wrap">
        <div className="bl-skel bl-skel-title" />
        <div className="bl-skel bl-skel-line" />
        <div className="bl-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bl-skel-card">
              <div className="bl-skel bl-skel-img" />
              <div className="bl-skel bl-skel-line" />
              <div className="bl-skel bl-skel-price" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">טוען…</span>
    </main>
  );
}
