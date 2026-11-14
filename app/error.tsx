"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="dp-login">
      <div className="dp-login-card">
        <h1>לא הצלחנו לטעון את העמוד</h1>
        <p>נסו שוב בעוד רגע.</p>
        <button className="dp-btn" onClick={reset}>
          ניסיון נוסף
        </button>
        <a className="dp-text-link" href="/">
          חזרה לאתר
        </a>
      </div>
    </main>
  );
}
