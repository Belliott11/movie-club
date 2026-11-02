import { key } from "./stats"

/** Winners of the Palme d'Or at Cannes (or the Grand Prix that came before it, up to 1954), as title and year. Hand-made, and the titles are as TMDB spells them. */
const CANNES: [string, number][] = [
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

/** Winners of the Golden Lion at Venice. Years where it wasn't awarded, or where I'm not sure of the winner, are left out. */
const VENICE: [string, number][] = [
  ["Rashomon", 1950], ["Forbidden Games", 1952], ["Romeo and Juliet", 1954], ["Ordet", 1955], ["Aparajito", 1956], ["Rickshaw Man", 1958], ["General Della Rovere", 1959],
  ["The Great War", 1959], ["Last Year at Marienbad", 1961], ["Ivan's Childhood", 1962], ["Family Diary", 1962], ["Hands over the City", 1963], ["Red Desert", 1964],
  ["The Battle of Algiers", 1966], ["Belle de Jour", 1967], ["Atlantic City", 1980], ["Gloria", 1980], ["Marianne and Juliane", 1981], ["The State of Things", 1982],
  ["Prénom Carmen", 1983], ["Year of the Quiet Sun", 1984], ["Vagabond", 1985], ["The Green Ray", 1986], ["Au Revoir les Enfants", 1987], ["The Legend of the Holy Drinker", 1988],
  ["A City of Sadness", 1989], ["Rosencrantz & Guildenstern Are Dead", 1990], ["Urga", 1991], ["The Story of Qiu Ju", 1992], ["Short Cuts", 1993], ["Three Colors: Blue", 1993],
  ["Before the Rain", 1994], ["Vive L'Amour", 1994], ["Cyclo", 1995], ["Michael Collins", 1996], ["Hana-bi", 1997], ["Not One Less", 1999], ["The Circle", 2000],
  ["Monsoon Wedding", 2001], ["The Magdalene Sisters", 2002], ["The Return", 2003], ["Vera Drake", 2004], ["Brokeback Mountain", 2005], ["Still Life", 2006],
  ["Lust, Caution", 2007], ["The Wrestler", 2008], ["Lebanon", 2009], ["Somewhere", 2010], ["Faust", 2011], ["Pietà", 2012], ["Sacro GRA", 2013],
  ["A Pigeon Sat on a Branch Reflecting on Existence", 2014], ["From Afar", 2015], ["The Woman Who Left", 2016], ["The Shape of Water", 2017], ["Roma", 2018], ["Joker", 2019],
  ["Nomadland", 2020], ["Happening", 2021], ["All the Beauty and the Bloodshed", 2022], ["Poor Things", 2023], ["The Room Next Door", 2024],
]

/** Winners of the Golden Bear at Berlin, with the same caveat. */
const BERLIN: [string, number][] = [
  ["The Wages of Fear", 1953], ["12 Angry Men", 1957], ["Wild Strawberries", 1958], ["La Notte", 1961], ["A Kind of Loving", 1962], ["Alphaville", 1965], ["Cul-de-sac", 1966],
  ["Le Départ", 1967], ["The Garden of the Finzi-Continis", 1971], ["The Canterbury Tales", 1972], ["The Apprenticeship of Duddy Kravitz", 1974], ["Buffalo Bill and the Indians", 1976],
  ["Veronika Voss", 1982], ["Love Streams", 1985], ["Wetherby", 1985], ["Red Sorghum", 1988], ["Rain Man", 1989], ["Music Box", 1990], ["Grand Canyon", 1992],
  ["The Wedding Banquet", 1993], ["In the Name of the Father", 1994], ["Sense and Sensibility", 1995], ["The People vs. Larry Flynt", 1996], ["Central Station", 1998],
  ["The Thin Red Line", 1999], ["Magnolia", 1999], ["Intimacy", 2001], ["Spirited Away", 2001], ["In This World", 2002], ["Head-On", 2004], ["Grbavica", 2006],
  ["Tuya's Marriage", 2006], ["Elite Squad", 2007], ["The Milk of Sorrow", 2009], ["Honey", 2010], ["A Separation", 2011], ["Caesar Must Die", 2012], ["Child's Pose", 2013],
  ["Black Coal, Thin Ice", 2014], ["Taxi", 2015], ["Fire at Sea", 2016], ["On Body and Soul", 2017], ["Touch Me Not", 2018], ["Synonyms", 2019], ["There Is No Evil", 2020],
  ["Alcarràs", 2022], ["On the Adamant", 2023], ["Dahomey", 2024],
]

/** Every film that won the top prize at Cannes, Venice or Berlin. */
export const FESTIVAL_WINNERS: [string, number][] = [...new Map([...CANNES, ...VENICE, ...BERLIN].map(f => [`${f[0]}|${f[1]}`, f] as const)).values()] // a film that won twice is listed once

const WON = new Set(FESTIVAL_WINNERS.map(([t, y]) => key(t, y)))
const WON_TITLES = new Set(FESTIVAL_WINNERS.map(([t]) => key(t, 0).split("|")[0]))

/** Whether a film won the top prize at Cannes, Venice or Berlin. The year may be a year either side (release years differ by region). */
export const wonFestival = (title: string, year: number) => WON.has(key(title, year)) || WON.has(key(title, year - 1)) || WON.has(key(title, year + 1)) || (WON_TITLES.has(key(title, 0).split("|")[0]) && FESTIVAL_WINNERS.some(([t, y]) => key(t, 0) === key(title, 0) && Math.abs(y - year) <= 1))
