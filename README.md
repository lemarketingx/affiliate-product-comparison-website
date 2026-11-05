# אתר השוואת מוצרים אפיליאייט

## מערכת קשר — שותפים ליועץ משכנתאות

כל קוד מערכת **קשר** נמצא בתיקייה [`kesher/`](./kesher), כפרויקט עצמאי לצד אתר השוואת המוצרים.

התיקייה כוללת את ממשק המנהל ואזור השותף, קליטת הפניות וקישורים אישיים, ניהול סטטוסים ועמלות, הגדרת מסד הנתונים והמיגרציה, הבדיקות, העיצוב והגופנים. העמלה מתחילה ללא סכום מוגדר.

להרצת מערכת קשר:

```bash
cd kesher
npm ci
npm run dev
```

הוראות ההפעלה, ההתחברות, מסד הנתונים והבדיקות מופיעות ב־[`kesher/README.md`](./kesher/README.md). המערכת משתמשת ב־Vinext וב־Cloudflare D1, ובהתחברות שמספקת Sites. הוספת הקוד למאגר אינה מחברת אוטומטית את GitHub לפרסום האתר החי.

הפקודות משורש המאגר ממשיכות להשתייך לאתר השוואת המוצרים. מערכת קשר מופרדת מבדיקות TypeScript ו־ESLint של אתר זה.


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
