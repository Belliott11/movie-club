import { useMemo, useState } from "react"
import { Collapse } from "@/components/Collapse"
import { PlanList } from "@/components/PlanList"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LbEntry } from "@/lib/letterboxd"
import { seenMatcher } from "@/lib/plan"
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
  const seen = useMemo(() => seenMatcher(history, plan?.overrides), [history, plan?.overrides])

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
    <Collapse id="me-plan" title="My watch plan">
    <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Only you can see this.</p>

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
          <PlanList plan={plan} seen={seen} overrides={plan.overrides} onSeen={setSeen} onSuggest={f => suggest(f.title, f.year ?? null)} />
          {replacing ? form : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-11 px-4" onClick={() => setReplacing(true)}>Replace plan</Button>
              <Button variant="ghost" className="h-11 px-4" onClick={lock}>Lock on this device</Button>
              <Button variant="ghost" className="h-11 px-4 text-destructive" onClick={() => { if (confirm("Delete your plan everywhere?")) remove() }}>Delete plan</Button>
            </div>
          )}
        </>
      )}
    </div>
    </Collapse>
  )
}
