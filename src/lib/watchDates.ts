import type { Movie } from "./types"

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`) // noon UTC, so a daylight-saving change can't move the day
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * A starting guess for films with no date: the first film (in watched order) gets `start`, the next one `stepDays` later, and so on.
 * Films that already have a date keep it, and still count as a place in the schedule, so a fixed date doesn't shift the others.
 */
export function weeklyDates(movies: Movie[], start: string, stepDays = 7): { movie: Movie; date: string }[] {
  return [...movies].sort((a, b) => a.seq - b.seq).flatMap((m, i) => (m.watched_on ? [] : [{ movie: m, date: addDays(start, i * stepDays) }]))
}
