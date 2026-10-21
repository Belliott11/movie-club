/**
 * Where a value sits between `lo` and `hi`, as a tint: low values lean magenta, high values lean cyan, the middle stays neutral.
 * `pct` is how strongly to tint (0 to 40), so a mid value fades into the page and the extremes stand out.
 */
export function heatTint(v: number, lo: number, hi: number): { side: "low" | "high"; pct: number } {
  const t = hi === lo ? 0.5 : Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
  return { side: t < 0.5 ? "low" : "high", pct: Math.round(Math.abs(t - 0.5) * 2 * 40) }
}

export const heatStyle = (v: number, lo: number, hi: number) => {
  const { side, pct } = heatTint(v, lo, hi)
  return { background: `color-mix(in oklab, var(${side === "low" ? "--us" : "--world"}) ${pct}%, transparent)` }
}
