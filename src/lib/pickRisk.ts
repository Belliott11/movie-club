import { avg, groupAvg, spread } from "./stats"
import type { Movie } from "./types"

export type PickStyle = {
  n: string
  picks: number
  /** average of the club's average rating across their picks */
  result: number
  /** average disagreement (standard deviation of ratings) across their picks: a high number means their picks split the room */
  risk: number
  /** share of their picks that beat the club's overall average */
  hitRate: number
  /** the pick that split the room most, and the one the club liked most */
  boldest: Movie
  best: Movie
}

/**
 * How each person picks. Risk is how much a pick divides the room, so a gambler's picks are loved by some and hated by others;
 * the hit rate is how often a pick beats the club's overall average. Only films with at least `minRaters` ratings count.
 */
export function pickStyles(movies: Movie[], minRaters = 3): { styles: PickStyle[]; clubAverage: number } {
  const rated = movies.filter(m => Object.keys(m.ratings).length >= minRaters)
  const clubAverage = avg(rated.map(m => groupAvg(m)!)) ?? 0
  const pickers = [...new Set(rated.map(m => m.pick).filter(Boolean))]
  const styles = pickers.map((n): PickStyle => {
    const mine = rated.filter(m => m.pick === n)
    const by = (f: (m: Movie) => number) => [...mine].sort((a, b) => f(b) - f(a) || a.title.localeCompare(b.title))[0]
    return {
      n,
      picks: mine.length,
      result: avg(mine.map(m => groupAvg(m)!))!,
      risk: avg(mine.map(spread))!,
      hitRate: mine.filter(m => groupAvg(m)! > clubAverage).length / mine.length,
      boldest: by(spread),
      best: by(m => groupAvg(m)!),
    }
  })
  return { styles, clubAverage }
}

/** A one-line description of how someone picks, from where they sit among the others. */
export function styleLabel(s: PickStyle, all: PickStyle[]) {
  const risks = all.map(x => x.risk).sort((a, b) => a - b), results = all.map(x => x.result).sort((a, b) => a - b)
  const high = (v: number, sorted: number[]) => sorted.indexOf(v) >= sorted.length / 2
  const bold = high(s.risk, risks), good = high(s.result, results)
  return bold ? (good ? "Gambler who delivers" : "Gambler") : good ? "Safe hands" : "Slow burner"
}
