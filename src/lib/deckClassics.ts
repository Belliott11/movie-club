import type { Film } from "./atlas"

/**
 * Hand-picked, well-known films for the cards TMDB can't search (who directed it, what it cost, what it won).
 * They are suggestions to start from, not a complete list; every one genuinely meets its card.
 */
export const WOMAN_DIRECTED: Film[] = [
  ["Cléo from 5 to 7", 1962], ["Daisies", 1966], ["Wanda", 1970], ["Jeanne Dielman, 23, quai du Commerce, 1080 Bruxelles", 1975], ["Vagabond", 1985],
  ["Daughters of the Dust", 1991], ["Orlando", 1992], ["The Piano", 1993], ["Beau Travail", 1999], ["Lost in Translation", 2003], ["The Hurt Locker", 2008],
  ["Fish Tank", 2009], ["Zero Dark Thirty", 2012], ["Selma", 2014], ["Mustang", 2015], ["Toni Erdmann", 2016], ["Lady Bird", 2017], ["Wonder Woman", 2017],
  ["Little Women", 2019], ["Portrait of a Lady on Fire", 2019], ["Nomadland", 2020], ["Never Rarely Sometimes Always", 2020], ["Petite Maman", 2021],
  ["Titane", 2021], ["The Power of the Dog", 2021], ["Aftersun", 2022], ["Past Lives", 2023], ["Barbie", 2023], ["Anatomy of a Fall", 2023],
]

/** Made for under five million dollars. */
export const LOW_BUDGET: Film[] = [
  ["Shadows", 1959], ["Carnival of Souls", 1962], ["Night of the Living Dead", 1968], ["Pink Flamingos", 1972], ["Eraserhead", 1977], ["Halloween", 1978],
  ["Mad Max", 1979], ["The Evil Dead", 1981], ["Stranger Than Paradise", 1984], ["She's Gotta Have It", 1986], ["Sex, Lies, and Videotape", 1989],
  ["Slacker", 1991], ["Reservoir Dogs", 1992], ["El Mariachi", 1992], ["Clerks", 1994], ["Pi", 1998], ["Following", 1998], ["The Blair Witch Project", 1999],
  ["Primer", 2004], ["Napoleon Dynamite", 2004], ["Paranormal Activity", 2007], ["Once", 2007], ["Whiplash", 2014], ["Tangerine", 2015], ["Moonlight", 2016], ["Get Out", 2017],
]

/** Winners of at least one Academy Award, most of them Best Picture. */
export const OSCAR_WINNERS: Film[] = [
  ["Gone with the Wind", 1939], ["Casablanca", 1942], ["All About Eve", 1950], ["On the Waterfront", 1954], ["Ben-Hur", 1959], ["The Apartment", 1960],
  ["West Side Story", 1961], ["Lawrence of Arabia", 1962], ["Midnight Cowboy", 1969], ["The French Connection", 1971], ["The Godfather", 1972],
  ["The Godfather Part II", 1974], ["One Flew Over the Cuckoo's Nest", 1975], ["Rocky", 1976], ["Annie Hall", 1977], ["Amadeus", 1984], ["Platoon", 1986],
  ["Rain Man", 1988], ["Dances with Wolves", 1990], ["The Silence of the Lambs", 1991], ["Unforgiven", 1992], ["Schindler's List", 1993], ["Forrest Gump", 1994],
  ["Titanic", 1997], ["American Beauty", 1999], ["Gladiator", 2000], ["No Country for Old Men", 2007], ["Slumdog Millionaire", 2008], ["The Artist", 2011],
  ["12 Years a Slave", 2013], ["Birdman or (The Unexpected Virtue of Ignorance)", 2014], ["Spotlight", 2015], ["Parasite", 2019], ["CODA", 2021],
  ["Everything Everywhere All at Once", 2022], ["Oppenheimer", 2023],
]
