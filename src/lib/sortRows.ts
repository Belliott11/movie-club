export type Dir = "asc" | "desc"

/** Sorts rows by one column. Blank values always sit at the bottom, whichever way you sort. */
export function sortRows<T>(rows: T[], get: (r: T) => number | string | null | undefined, dir: Dir): T[] {
  const sign = dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = get(a), y = get(b)
    const bx = x == null || x === "", by = y == null || y === ""
    if (bx || by) return bx === by ? 0 : bx ? 1 : -1
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { sensitivity: "base" })) * sign
  })
}
