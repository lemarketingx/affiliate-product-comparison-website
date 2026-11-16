"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="bl-state" role="alert">
      <div className="bl-state-card">
        <span className="bl-state-mark" aria-hidden="true">!</span>
        <h1>לא הצלחנו לטעון את העמוד</h1>
        <p>זו תקלה זמנית אצלנו, לא אצלכם. לא הוצג מחיר שאינו מעודכן.</p>
        <div className="bl-state-actions">
          <button className="bl-cta" onClick={reset} type="button">
            ניסיון נוסף
          </button>
          <a className="bl-cta is-ghost" href="/">
            חזרה לדף הבית
          </a>
        </div>
      </div>
    </main>
  );
}
