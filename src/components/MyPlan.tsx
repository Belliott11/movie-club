import { useMemo, useState } from "react"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LbEntry } from "@/lib/letterboxd"
import { filmKey, groupProgress, seenMatcher, upNext } from "@/lib/plan"
import { useStore } from "@/lib/store"
import { usePlan } from "@/lib/usePlan"

/** Only ever shown to the person it belongs to, on their own page. */
export function MyPlan({ name, history }: { name: string; history: LbEntry[] | undefined }) {
  const { suggest } = useStore()
  const { plan, status, save, unlock, lock, remove, setSeen } = usePlan(name)
  const [text, setText] = useState("")
  const [pass, setPass] = useState("")
  const [bad, setBad] = useState("")
  const [replacing, setReplacing] = useState(false)
  const [openGroup, setOpenGroup] = useState<number | null>(null)
  const seen = useMemo(() => seenMatcher(history, plan?.overrides), [history, plan?.overrides])
  const all = plan?.groups.flatMap(g => g.films) ?? []
  const done = all.filter(seen).length
  const next = plan ? upNext(plan, seen) : null

  if (status === "loading") return null
  const form = (
    <form className="flex flex-col gap-2" onSubmit={async e => { e.preventDefault(); setBad(""); if (!(await save(text, pass))) setBad("Couldn't find any groups in that text. Paste the whole plan, with its \"GROUP 1: ...\" headings."); else { setText(""); setPass(""); setReplacing(false) } }}>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={5} aria-label="Your watching plan" placeholder="Paste your plan here" className="w-full rounded-lg border border-input bg-transparent p-2.5 text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <Input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Choose a passphrase" aria-label="Passphrase for your plan" autoComplete="new-password" className="h-11 w-56" />
        <Button type="submit" className="h-11 px-4" disabled={pass.length < 4 || !text.trim()}>Save my plan</Button>
      </div>
      <p className="text-xs text-muted-foreground">Your plan is locked with this passphrase before it's saved, so nobody else in the club (or looking at the database) can read it. You'll need the passphrase on other devices. It can't be reset. A longer passphrase is harder to guess.</p>
      {bad && <p role="alert" className="text-sm text-destructive">{bad}</p>}
    </form>
  )

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="flex items-center gap-1.5 text-xl font-bold"><Lock className="size-4" aria-hidden />My watch plan</h3>
        <p className="text-sm text-muted-foreground">Only you can see this.</p>
      </div>

      {status === "none" && form}

      {status === "locked" && (
        <form className="flex flex-wrap items-center gap-2" onSubmit={async e => { e.preventDefault(); setBad(""); if (!(await unlock(pass))) setBad("That passphrase is wrong."); else setPass("") }}>
          <Input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Passphrase" aria-label="Passphrase for your plan" autoComplete="current-password" className="h-11 w-56" />
          <Button type="submit" className="h-11 px-4" disabled={!pass}>Unlock my plan</Button>
          {bad && <p role="alert" className="w-full text-sm text-destructive">{bad}</p>}
        </form>
      )}

      {status === "open" && plan && (
        <>
          <p><b className="font-display text-2xl">{done}</b> <span className="text-muted-foreground">of {all.length} films seen, going by your Letterboxd history</span></p>
          {next && (
            <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
              <p className="text-sm text-muted-foreground">Up next: group {next.group.n}, {next.group.title.toLowerCase()}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {next.films.map(f => <li key={f.title} className="flex items-center justify-between gap-2"><span className="min-w-0 truncate font-medium">{f.title}{f.year ? ` (${f.year})` : ""}</span>{plan.long.includes(f.title) && <span className="shrink-0 text-xs text-muted-foreground">long, save for a weekend</span>}</li>)}
              </ul>
            </div>
          )}
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {plan.groups.map(g => {
              const p = groupProgress(g, seen), isOpen = openGroup === g.n
              return (
                <li key={g.n}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpenGroup(isOpen ? null : g.n)} className="flex min-h-11 w-full items-center gap-3 py-2 text-left">
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-medium ${p.complete ? "text-muted-foreground line-through" : ""}`}>{g.n}. {g.title.charAt(0) + g.title.slice(1).toLowerCase()}</span>
                      <span className="mt-1 block h-1.5 rounded-full bg-muted"><span className="block h-full rounded-full bg-world" style={{ width: `${(p.done / Math.max(1, p.total)) * 100}%` }} /></span>
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground">{p.done} / {p.total}</span>
                  </button>
                  {isOpen && (
                    <div className="pb-3">
                      {g.blurb && <p className="mb-2 text-sm text-muted-foreground">{g.blurb}</p>}
                      <ul className="flex flex-col">
                        {g.films.map(f => {
                          const s = seen(f)
                          return (
                            <li key={f.title + f.year} className="flex items-center gap-2 py-1 text-sm">
                              <button type="button" role="checkbox" aria-checked={s} aria-label={`${f.title}: seen`} onClick={() => setSeen(f, !s)} className="-m-2 flex size-11 shrink-0 items-center justify-center">
                                <span className={`block size-5 rounded-full border-2 ${s ? "border-world bg-world" : "border-border"}`} />
                              </button>
                              <span className={`min-w-0 flex-1 ${s ? "text-muted-foreground line-through" : ""}`}>{f.title}{f.year ? ` (${f.year})` : ""}{plan.overrides?.[filmKey(f)] != null && <button type="button" className="ml-1.5 text-xs underline" onClick={() => setSeen(f, null)}>set by you, undo</button>}</span>
                              {!s && <Button variant="ghost" className="h-9 shrink-0 px-2 text-xs" onClick={() => suggest(f.title, f.year ?? null)}>Suggest to club</Button>}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {replacing ? form : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-11 px-4" onClick={() => setReplacing(true)}>Replace plan</Button>
              <Button variant="ghost" className="h-11 px-4" onClick={lock}>Lock on this device</Button>
              <Button variant="ghost" className="h-11 px-4 text-destructive" onClick={() => { if (confirm("Delete your plan everywhere?")) remove() }}>Delete plan</Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
