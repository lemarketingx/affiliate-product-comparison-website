/** Keyword variations used only for DISCOVERY; brand and seller verification
 * remains exclusively in the catalog publisher. Search result rank is not proof.
 * 4 independent queries × 2 pages × 50 rows = up to 400 candidates per brand.
 */
const variations: Record<string, string[]> = {
  xiaomi:["Xiaomi phone","Xiaomi smart home","Xiaomi accessories"],
  anker:["Anker charger","Anker power bank","Anker soundcore"],
  ugreen:["UGREEN USB C","UGREEN charger","UGREEN hub"],
  baseus:["Baseus charger","Baseus car","Baseus cable"],
  lenovo:["Lenovo thinkplus","Lenovo tablet","Lenovo earbuds"],
  dreame:["Dreame vacuum","Dreame robot","Dreame accessories"],
  roborock:["Roborock vacuum","Roborock robot","Roborock parts"],
  ecovacs:["Ecovacs deebot","Ecovacs robot","Ecovacs accessories"],
  amazfit:["Amazfit watch","Amazfit band","Amazfit accessories"],
  insta360:["Insta360 camera","Insta360 accessories","Insta360 mount"],
  qcy:["QCY earbuds","QCY headphones","QCY TWS"],
  tineco:["Tineco vacuum","Tineco floor one","Tineco accessories"],
};
export const BRAND_CANDIDATE_TARGET=100;
export function brandSearchTerms(slug:string,primary:string):string[]{
  return [...new Set([primary,...(variations[slug]??[])])];
}
