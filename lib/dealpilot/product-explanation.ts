/**
 * Short, conservative explanations inferred from the listed product title.
 * Never infer unprovided specifications, compatibility or certifications.
 * Avoid sending product content to external AI services on page views.
 */
export type ProductExplanation = {
  what: string;
  forWhom: string;
  check: string;
  source: "title" | "category";
};
type Rule = { pattern: RegExp; what: string; forWhom: string; check: string };
const rules: Rule[] = [
  {pattern:/dash.?cam|car.?camera|מצלמת דרך|מצלמת רכב|a800s|70mai/i,what:"מצלמת דרך המיועדת לתיעוד הנסיעה ברכב.",forWhom:"לנהגים שרוצים תיעוד של הדרך.",check:"בדקו איכות צילום, אפשרות צילום בחניה, סוג חיבור לחשמל וכרטיס זיכרון בדגם המדויק."},
  {pattern:/robot.?vacuum|robot.?clean|שואב רובוט|roborock|dreame.*(?:l10|l20|x40)/i,what:"שואב רובוטי לניקוי רצפות באופן אוטומטי.",forWhom:"למי שמחפש להפחית ניקיון ידני שוטף.",check:"בדקו אם הדגם כולל שטיפה, תחנת ריקון, התאמה לסוג הרצפה ואחריות בישראל."},
  {pattern:/air.?purifier|מטהר אוויר/i,what:"מכשיר המיועד לסינון אוויר בחדר.",forWhom:"למי שרוצה לשפר את סינון החלקיקים בחלל הבית.",check:"בדקו שטח כיסוי, סוג מסנן, עלות מסננים חלופיים והתאמת מתח חשמל."},
  {pattern:/earbuds|earphones|headphones|headset|soundcore|אוזניות|bowie/i,what:"אוזניות להאזנה למוזיקה, שיחות ותוכן מהטלפון או מהמחשב.",forWhom:"למי שמאזין בדרכים, בעבודה או בבית.",check:"בדקו את צורת האוזניות, התאמה למכשיר, חיי סוללה והאם ביטול רעשים קיים בדגם המסוים."},
  {pattern:/smart.?watch|redmi.?watch|amazfit|שעון חכם/i,what:"שעון חכם להצגת התראות ומעקב אחר פעילות יומיומית.",forWhom:"למי שרוצה מידע מהטלפון על פרק היד.",check:"בדקו תאימות לאנדרואיד או לאייפון, פונקציות ספורט, שפה וחיי סוללה."},
  {pattern:/smart.?band|fitness.?band|צמיד חכם/i,what:"צמיד לביש המיועד למעקב אחר פעילות ולהצגת התראות.",forWhom:"למי שמעדיף אביזר קטן וקל על פני שעון.",check:"בדקו התאמה לטלפון, אפשרויות מדידה, רצועות תואמות ותכונות הדגם."},
  {pattern:/power.?bank|סוללת גיבוי/i,what:"סוללה ניידת לטעינת מכשירים ללא שקע זמין.",forWhom:"למי שזקוק לטעינה מחוץ לבית.",check:"בדקו קיבולת, הספק, יציאות, מגבלות הטסה ותקני בטיחות."},
  {pattern:/charger|charging|מטען|gan|usb.?c.?pd/i,what:"אביזר טעינה למכשירים אלקטרוניים.",forWhom:"למי שצריך טעינה בבית, ברכב או בדרכים.",check:"בדקו הספק בפועל, יציאות, תאימות למכשיר, תקע ותקני בטיחות."},
  {pattern:/security.?camera|ip.?camera|מצלמת אבטחה/i,what:"מצלמה לצפייה או לתיעוד באזור מוגדר.",forWhom:"למי שמחפש פתרון מעקב לבית או לעסק.",check:"בדקו אופן אחסון הקלטות, חיבור לרשת, פרטיות, חשמל והתאמה לתנאי חוץ."},
  {pattern:/keyboard|מקלדת/i,what:"מקלדת לשימוש במחשב או במכשיר נתמך.",forWhom:"למי שמחפש אביזר להקלדה ולעבודה.",check:"בדקו פריסה, שפת מקשים, סוג חיבור, מערכת הפעלה ואחריות."},
  {pattern:/mouse|עכבר/i,what:"עכבר לשליטה במחשב.",forWhom:"למי שמחפש אביזר עבודה או משחק.",check:"בדקו חיבור, גודל, ארגונומיה, סוללה ותאימות למחשב."},
  {pattern:/vacuum|שואב אבק/i,what:"מכשיר לניקוי אבק ולכלוך ממשטחים.",forWhom:"למי שמחפש פתרון לניקיון שוטף.",check:"בדקו את סוג השואב, אביזרים בערכה, חלקי חילוף ואחריות."},
];
function categoryFallback(category: string): ProductExplanation {
  const cat=category.trim();
  return {what:cat ? "מוצר בתחום "+cat+"; השימוש המדויק תלוי בדגם ובגרסה שמציע המוכר." : "פריט המוצג בקטלוג; ייעודו המדויק דורש בדיקה בתיאור היצרן.",forWhom:"למי שמחפש מוצר מסוג זה ומתכנן להשוות בין דגמים.",check:"בדקו את תיאור היצרן, המפרט, התאמה לישראל, תכולת הערכה והדגם המדויק לפני רכישה.",source:"category"};
}
export function explainProduct(title:string,category:string):ProductExplanation {
  const normalized=title.trim().slice(0,500);
  for (const rule of rules) if(rule.pattern.test(normalized)) return {...rule,source:"title"};
  return categoryFallback(category);
}
