import { key } from "./stats"

/** Winners of the Palme d'Or at Cannes (or the Grand Prix that came before it, up to 1954), as title and year. Hand-made, and the titles are as TMDB spells them. */
export const CANNES: [string, number][] = [
  ["The Third Man", 1949], ["Miracle in Milan", 1951], ["Othello", 1951], ["The Wages of Fear", 1953], ["Gate of Hell", 1953],
  ["Marty", 1955], ["The Silent World", 1956], ["Friendly Persuasion", 1956], ["The Cranes Are Flying", 1957], ["Black Orpheus", 1959], ["La Dolce Vita", 1960],
  ["Viridiana", 1961], ["The Given Word", 1962], ["The Leopard", 1963], ["The Umbrellas of Cherbourg", 1964], ["The Knack ...and How to Get It", 1965],
  ["A Man and a Woman", 1966], ["Blow-Up", 1966], ["if....", 1968], ["M*A*S*H", 1970], ["The Go-Between", 1971], ["The Working Class Goes to Heaven", 1971],
  ["The Mattei Affair", 1972], ["Scarecrow", 1973], ["The Conversation", 1974], ["Taxi Driver", 1976], ["Padre Padrone", 1977], ["The Tree of Wooden Clogs", 1978],
  ["Apocalypse Now", 1979], ["The Tin Drum", 1979], ["All That Jazz", 1979], ["Kagemusha", 1980], ["Man of Iron", 1981], ["Missing", 1982], ["Yol", 1982],
  ["The Ballad of Narayama", 1983], ["Paris, Texas", 1984], ["When Father Was Away on Business", 1985], ["The Mission", 1986], ["Under the Sun of Satan", 1987],
  ["Pelle the Conqueror", 1987], ["Sex, Lies, and Videotape", 1989], ["Wild at Heart", 1990], ["Barton Fink", 1991], ["The Best Intentions", 1992],
  ["Farewell My Concubine", 1993], ["The Piano", 1993], ["Pulp Fiction", 1994], ["Underground", 1995], ["Secrets & Lies", 1996], ["Taste of Cherry", 1997],
  ["The Eel", 1997], ["Eternity and a Day", 1998], ["Rosetta", 1999], ["Dancer in the Dark", 2000], ["The Son's Room", 2001], ["The Pianist", 2002],
  ["Elephant", 2003], ["Fahrenheit 9/11", 2004], ["The Child", 2005], ["The Wind That Shakes the Barley", 2006], ["4 Months, 3 Weeks and 2 Days", 2007],
  ["The Class", 2008], ["The White Ribbon", 2009], ["Uncle Boonmee Who Can Recall His Past Lives", 2010], ["The Tree of Life", 2011], ["Amour", 2012],
  ["Blue Is the Warmest Colour", 2013], ["Winter Sleep", 2014], ["Dheepan", 2015], ["I, Daniel Blake", 2016], ["The Square", 2017], ["Shoplifters", 2018],
  ["Parasite", 2019], ["Titane", 2021], ["Triangle of Sadness", 2022], ["Anatomy of a Fall", 2023], ["Anora", 2024], ["It Was Just an Accident", 2025],
]

const WON = new Set(CANNES.map(([t, y]) => key(t, y)))
const WON_TITLES = new Set(CANNES.map(([t]) => key(t, 0).split("|")[0]))

/** Whether a film won at Cannes. The year may be a year either side (release years differ by region). */
export const wonCannes = (title: string, year: number) => WON.has(key(title, year)) || WON.has(key(title, year - 1)) || WON.has(key(title, year + 1)) || (WON_TITLES.has(key(title, 0).split("|")[0]) && CANNES.some(([t, y]) => key(t, 0) === key(title, 0) && Math.abs(y - year) <= 1))
