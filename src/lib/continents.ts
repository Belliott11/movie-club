export const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"] as const
export type Continent = (typeof CONTINENTS)[number]

const BY: Record<Continent, string> = {
  Africa: "DZ AO BJ BW BF BI CM CV CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW",
  Asia: "AF AM AZ BH BD BT BN KH CN CY GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE",
  // Russia and the countries that no longer exist (Soviet Union, Yugoslavia, Czechoslovakia, East Germany) count as Europe
  Europe: "AL AD AT BY BE BA BG HR CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA SU YU XC DD",
  "North America": "AG BS BB BZ CA CR CU DM DO SV GD GT HT HN JM MX NI PA KN LC VC TT US PR GL",
  "South America": "AR BO BR CL CO EC GY PY PE SR UY VE",
  Oceania: "AU FJ KI MH FM NR NZ PW PG WS SB TO TV VU",
}
const CODE = new Map<string, Continent>(CONTINENTS.flatMap(c => BY[c].split(" ").map(code => [code, c] as const)))

/** The continent a TMDB country code (US, JP, ...) belongs to, or undefined when it's not one we know. */
export const continentOfCode = (code: string | undefined | null) => (code ? CODE.get(code.toUpperCase()) : undefined)

const names = new Intl.DisplayNames(["en"], { type: "region" })
let byName: Map<string, Continent> | null = null
/** The continent for a country name as the site writes it ("USA", "Japan", "Hong Kong SAR China"). */
export function continentOfName(name: string | undefined | null): Continent | undefined {
  if (!name) return undefined
  byName ??= new Map([...CODE].flatMap(([code, c]) => { try { return [[code === "US" ? "USA" : names.of(code) ?? code, c] as const] } catch { return [] } }))
  return byName.get(name)
}
