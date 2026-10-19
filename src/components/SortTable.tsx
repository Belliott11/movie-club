import { useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { sortRows, type Dir } from "@/lib/sortRows"

export type Column<T> = {
  id: string
  label: string
  get: (r: T) => number | string | null | undefined
  render?: (r: T) => ReactNode
  /** First click sorts this way (names read best A to Z, scores best high to low). */
  first?: Dir
}

/** A table whose every column heading sorts it. Click again to flip; the arrow shows the current order. */
export function SortTable<T>({ rows, columns, rowKey, initial }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; initial: { id: string; dir: Dir } }) {
  const [sort, setSort] = useState(initial)
  const col = columns.find(c => c.id === sort.id) ?? columns[0]
  const shown = sortRows(rows, col.get, sort.dir)
  const click = (c: Column<T>) => setSort(s => (s.id === c.id ? { id: c.id, dir: s.dir === "asc" ? "desc" : "asc" } : { id: c.id, dir: c.first ?? "desc" }))

  return (
    <Table className="text-[13px] sm:text-sm [&_td]:px-1.5 [&_th]:px-1.5 sm:[&_td]:px-2 sm:[&_th]:px-2">
      <TableHeader>
        <TableRow>
          {columns.map(c => {
            const on = c.id === sort.id
            const Icon = !on ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
            return (
              <TableHead key={c.id} aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" onClick={() => click(c)} className="-mx-1 inline-flex min-h-11 items-center gap-1 rounded px-1 font-medium whitespace-nowrap" aria-label={`Sort by ${c.label}`}>
                  {c.label}
                  <Icon className={`size-3 shrink-0 ${on ? "" : "hidden opacity-40 sm:block"}`} aria-hidden />
                </button>
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {shown.map(r => (
          <TableRow key={rowKey(r)}>
            {columns.map(c => <TableCell key={c.id}>{c.render ? c.render(r) : String(c.get(r) ?? "–")}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
