const pad = (n: number) => String(n).padStart(2, "0")
export const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
export const fromIso = (iso: string): { y: number; m: number; d: number } | null => {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return p ? { y: +p[1], m: +p[2] - 1, d: +p[3] } : null
}

/** A month as rows of seven (Sunday first): the day numbers, with null for the blank cells before the 1st and after the last day. */
export function monthGrid(y: number, m: number): (number | null)[][] {
  const lead = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7))
}

/** "Oct 14, 2026" for display. */
export const niceDate = (iso: string) => {
  const p = fromIso(iso)
  return p ? new Date(p.y, p.m, p.d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""
}
