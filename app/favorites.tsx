"use client";
/* Favorites live only in this browser (localStorage). Nothing is sent anywhere. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowUpLeft } from "lucide-react";

export type Fav = {
  id: string;
  title: string;
  image: string | null;
  price: string;
  brand: string;
};
const KEY = "dp-favorites-v1";
const EVENT = "dp-favorites";

function read(): Fav[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.slice(0, 200) : [];
  } catch {
    return [];
  }
}
function write(list: Fav[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage unavailable: favorites simply do not persist */
  }
}
function useFavs() {
  const [list, setList] = useState<Fav[]>([]);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}

export function FavButton({ fav }: { fav: Fav }) {
  const list = useFavs();
  const on = list.some((f) => f.id === fav.id);
  return (
    <button
      type="button"
      className={"og-fav" + (on ? " is-on" : "")}
      aria-pressed={on}
      aria-label={on ? "הסרה מהמועדפים" : "שמירה במועדפים"}
      onClick={() =>
        write(on ? read().filter((f) => f.id !== fav.id) : [fav, ...read().filter((f) => f.id !== fav.id)])
      }
    >
      <Heart size={18} />
    </button>
  );
}

export function FavCount() {
  const list = useFavs();
  return (
    <Link href="/saved" className="og-icon-link" aria-label={"מועדפים: " + list.length}>
      <Heart size={21} />
      {list.length > 0 && <span className="og-badge">{list.length}</span>}
    </Link>
  );
}

export function FavoritesList() {
  const list = useFavs();
  if (!list.length)
    return (
      <div className="og-empty">
        <span>
          <Heart size={30} />
        </span>
        <h3>עוד לא שמרתם מוצרים</h3>
        <p>לחצו על הלב בכל מוצר כדי לשמור אותו כאן. הרשימה נשמרת רק בדפדפן הזה.</p>
        <Link className="og-btn" href="/deals">
          לכל המוצרים
        </Link>
      </div>
    );
  return (
    <ul className="og-fav-list">
      {list.map((f) => (
        <li key={f.id}>
          <Link href={"/products/" + f.id}>
            {f.image ? <img src={f.image} alt="" width={72} height={72} referrerPolicy="no-referrer" /> : <span />}
            <div>
              <small dir="ltr">{f.brand}</small>
              <strong dir="auto">{f.title}</strong>
              <em dir="auto">{f.price}</em>
            </div>
            <ArrowUpLeft size={18} />
          </Link>
          <FavButton fav={f} />
        </li>
      ))}
    </ul>
  );
}
