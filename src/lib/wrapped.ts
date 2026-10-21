import { avg, awardWinners, fmt, groupAvg, outsideAvg, overview, spread, tasteOverlap } from "./stats"
import type { Movie } from "./types"

export type Slide = {
  id: string
  /** small line above the headline */
  kicker: string
  /** the headline: a number, a name or a title */
  big: string
  /** one or two sentences under it */
  text: string
  /** a club film to show the poster of, and link to */
  film?: Movie
}

const stars = (n: number) => `${fmt(n, 1)} ${+fmt(n, 1) === 1 ? "star" : "stars"}`
const films = (n: number, word = "film") => `${n} ${word}${n === 1 ? "" : "s"}`

/**
 * The club's story so far as a short run of slides: the numbers, the best and worst film, the one you argued over, where you
 * parted from everyone else, the awards, and who rates alike. Slides with nothing to say (no divisive film yet, no award winner) are left out.
 */
export function wrappedSlides(movies: Movie[], members: string[], countries?: string[]): Slide[] {
  const rated = movies.filter(m => Object.keys(m.ratings).length)
  if (!rated.length) return []
  const sum = overview(movies)
  const people = members.filter(n => rated.some(m => m.ratings[n] != null))
  const byAvg = [...rated].sort((a, b) => groupAvg(b)! - groupAvg(a)! || a.title.localeCompare(b.title))
  const slides: Slide[] = [{
    id: "numbers", kicker: "The club so far", big: films(sum.films),
    text: `${sum.ratings} ratings from ${people.length} ${people.length === 1 ? "person" : "people"}, averaging ${fmt(sum.average, 1)} out of 5.`,
  }]

  const top = byAvg[0]
  slides.push({ id: "best", kicker: "Best film", big: top.title, text: `${fmt(groupAvg(top), 1)} out of 5, picked by ${top.pick}.${byAvg[1] ? ` Runner-up: ${byAvg[1].title} (${fmt(groupAvg(byAvg[1]), 1)}).` : ""}`, film: top })
  const low = byAvg[byAvg.length - 1]
  if (low !== top) slides.push({ id: "worst", kicker: "Lowest rated", big: low.title, text: `${fmt(groupAvg(low), 1)} out of 5, picked by ${low.pick}. Somebody had to.`, film: low })

  const split = rated.filter(m => Object.keys(m.ratings).length >= 3).sort((a, b) => spread(b) - spread(a))[0]
  if (split && spread(split) > 0) {
    const r = Object.entries(split.ratings).sort((a, b) => b[1] - a[1])
    slides.push({ id: "split", kicker: "The one you argued over", big: split.title, text: `${r[0][0]} gave it ${r[0][1]} and ${r[r.length - 1][0]} gave it ${r[r.length - 1][1]}.`, film: split })
  }

  const gap = rated.filter(m => outsideAvg(m) != null).sort((a, b) => Math.abs(groupAvg(b)! - outsideAvg(b)!) - Math.abs(groupAvg(a)! - outsideAvg(a)!))[0]
  if (gap) {
    const d = groupAvg(gap)! - outsideAvg(gap)!
    slides.push({ id: "gap", kicker: "Where you parted from everyone else", big: gap.title, text: `The club gave it ${fmt(groupAvg(gap), 1)}; IMDb, Rotten Tomatoes, Metacritic and Letterboxd average ${fmt(outsideAvg(gap), 1)}. You liked it ${stars(Math.abs(d))} ${d > 0 ? "more" : "less"}.`, film: gap })
  }

  const a = awardWinners(movies, members)
  if (a.picker) slides.push({ id: "picker", kicker: "Best picker", big: a.picker.n, text: `Their picks average ${fmt(a.picker.pickAvg, 1)}.` })
  if (a.harsh) slides.push({ id: "harsh", kicker: "Harshest critic", big: a.harsh.n, text: `Averages ${fmt(a.harsh.avg, 1)} across ${films(a.harsh.count)}.` })
  if (a.kind) slides.push({ id: "kind", kicker: "Most generous", big: a.kind.n, text: `Averages ${fmt(a.kind.avg, 1)} across ${films(a.kind.count)}.` })
  if (a.odd) slides.push({ id: "odd", kicker: "Most contrarian", big: a.odd.n, text: `Rates ${stars(a.odd.offGroup)} away from the group on a typical film.` })

  const regulars = people.filter(n => rated.every(m => m.ratings[n] != null))
  if (regulars.length) slides.push({ id: "regulars", kicker: regulars.length === 1 ? "Never missed a film" : "Never missed a film, all of you", big: regulars.join(", "), text: `Every one of the ${rated.length} screenings.` })

  const pairs = tasteOverlap(movies, members)
  if (pairs.length) {
    const p = pairs[0], far = pairs[pairs.length - 1]
    slides.push({ id: "twins", kicker: "Closest taste", big: `${p.a} and ${p.b}`, text: `Off by only ${stars(p.diff)} on average across ${films(p.n)}.${far !== p && far.diff > p.diff ? ` Furthest apart: ${far.a} and ${far.b}, ${stars(far.diff)}.` : ""}` })
  }

  const years = rated.map(m => m.year).filter(Boolean)
  if (years.length) {
    const old = rated.find(m => m.year === Math.min(...years))!, nu = rated.find(m => m.year === Math.max(...years))!
    slides.push({ id: "years", kicker: "Across the decades", big: `${Math.min(...years)} to ${Math.max(...years)}`, text: `From ${old.title} to ${nu.title}. The typical film came out in ${Math.round(avg(years)!)}.` })
  }
  if (countries && countries.length > 1) slides.push({ id: "world", kicker: "Around the world", big: films(countries.length, "country").replace("countrys", "countries"), text: `The club has watched films from ${countries.slice(0, 8).join(", ")}${countries.length > 8 ? " and more" : ""}.` })
  return slides
}

/** The same story as one block of text, for pasting into the group chat. */
export const wrappedText = (slides: Slide[]) => ["Movie club so far", ...slides.map(s => `${s.kicker}: ${s.big}. ${s.text}`)].join("\n")
