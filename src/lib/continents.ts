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

export const REGIONS = [
  "East Asia", "Southeast Asia", "South Asia", "Middle East and Central Asia", "Western Europe", "Nordic countries", "Southern Europe",
  "Eastern Europe and the Balkans", "North Africa", "Sub-Saharan Africa", "Latin America and the Caribbean", "US and Canada", "Oceania",
] as const
export type Region = (typeof REGIONS)[number]

const R: Record<Region, string> = {
  "East Asia": "CN HK MO TW JP KR KP MN",
  "Southeast Asia": "ID MY SG TH VN PH KH LA MM BN TL",
  "South Asia": "IN PK BD LK NP BT MV AF",
  "Middle East and Central Asia": "IR IQ IL JO LB SY TR SA AE QA KW BH OM YE PS CY AM AZ GE KZ KG TJ TM UZ",
  "Western Europe": "GB IE FR DE NL BE LU AT CH LI MC DD",
  "Nordic countries": "DK SE NO FI IS GL",
  "Southern Europe": "ES PT IT GR MT SM VA AD",
  "Eastern Europe and the Balkans": "RU UA BY PL CZ SK HU RO BG MD LT LV EE RS BA HR SI MK ME AL XK SU YU XC",
  "North Africa": "EG LY TN DZ MA SD",
  "Sub-Saharan Africa": "AO BJ BW BF BI CM CV CF TD KM CG CD CI DJ GQ ER SZ ET GA GM GH GN GW KE LS LR MG MW ML MR MU MZ NA NE NG RW ST SN SC SL SO ZA SS TZ TG UG ZM ZW",
  "Latin America and the Caribbean": "MX GT BZ HN SV NI CR PA CU DO HT JM PR TT BS BB AG DM GD KN LC VC AR BO BR CL CO EC GY PY PE SR UY VE",
  "US and Canada": "US CA",
  Oceania: "AU FJ KI MH FM NR NZ PW PG WS SB TO TV VU",
}
const RCODE = new Map<string, Region>(REGIONS.flatMap(r => R[r].split(" ").map(code => [code, r] as const)))

/** The region (a smaller slice than a continent: East Asia, the Nordic countries...) a TMDB country code belongs to. */
export const regionOfCode = (code: string | undefined | null) => (code ? RCODE.get(code.toUpperCase()) : undefined)

let rByName: Map<string, Region> | null = null
/** The region for a country name as the site writes it. */
export function regionOfName(name: string | undefined | null): Region | undefined {
  if (!name) return undefined
  rByName ??= new Map([...RCODE].flatMap(([code, r]) => { try { return [[code === "US" ? "USA" : names.of(code) ?? code, r] as const] } catch { return [] } }))
  return rByName.get(name)
}
