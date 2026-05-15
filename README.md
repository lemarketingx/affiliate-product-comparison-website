# אתר השוואת מוצרים אפיליאייט

בסיס אתר השוואת מוצרים בעברית, בנוי עם Next.js, TypeScript ו-Tailwind CSS.

## היקף

- מבנה App Router
- עיצוב רספונסיבי בגישת מובייל תחילה
- רכיבי פריסה ותצוגה לשימוש חוזר
- אתר עברי RTL
- נתיבי בסיס ללא מוצרים מדומים וללא חיבורי API בחזית

## נתיבים

- `/`
- `/deals`
- `/category/[slug]`
- `/product/[id]`
- `/blog`
- `/blog/[slug]`
- `/admin`

## הרצה מקומית

להפעלת סביבת פיתוח:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

פתחו את [http://localhost:3000](http://localhost:3000) בדפדפן.

## מבנה הפרויקט

- `src/app` כולל את נתיבי האפליקציה.
- `src/components` כולל רכיבי פריסה ותצוגה לשימוש חוזר.
- `src/lib` כולל הגדרות אתר וקבועים משותפים.
- `lib/aliexpress.js` כולל לקוח שרת עבור AliExpress Affiliate API.

## AliExpress API

יש להגדיר משתני סביבה לפני קריאות חיות ל-AliExpress:

```bash
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_TRACKING_ID=
ALIEXPRESS_API_URL=https://api-sg.aliexpress.com/sync
```

נתיבי שרת:

- `GET /api/aliexpress/search`
- `GET /api/aliexpress/product`
- `GET /api/aliexpress/hot`
- `GET|POST /api/aliexpress/generate-link`

ניתן להוסיף `?verify=1` לכל נתיב כדי לקבל בדיקת מוכנות מקומית שאינה קוראת ל-AliExpress ואינה חושפת סודות.

## הערות

חיבורי API, פידים, מוצרי אמת, התחברות ומערכת תוכן אינם מחוברים בשלב הזה.
