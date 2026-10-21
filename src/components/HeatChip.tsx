import type { ReactNode } from "react"
import { heatStyle } from "@/lib/heat"

/** A number on a tinted chip: red toward `lo`, teal toward `hi`, neutral between. The text is always the real value. */
export function HeatChip({ v, lo, hi, children }: { v: number | null; lo: number; hi: number; children: ReactNode }) {
  if (v == null) return <span className="text-muted-foreground">–</span>
  return <span className="num inline-block min-w-8 rounded-md px-1 py-0.5 text-center text-sm font-medium" style={heatStyle(v, lo, hi)}>{children}</span>
}
