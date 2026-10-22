import { useEffect, useState } from "react"
import { Collapse } from "@/components/Collapse"
import { Button } from "@/components/ui/button"
import { fieldCls } from "@/components/field"
import { useStore } from "@/lib/store"

/** Who picks this week. Whoever is designated can add the week's film and deal the pick cards; everyone else can watch. It lapses once that film is added. */
export function SelectorPanel() {
  const { members, selector, setSelector, canDesignate, me, movies } = useStore()
  const [name, setName] = useState(selector ?? "")
  useEffect(() => { setName(selector ?? "") }, [selector])
  const turn = Math.max(0, ...movies.map(m => m.seq)) + 1
  return (
    <Collapse id="next-selector" title="Who picks this week">
      <p className="mb-2 text-sm text-muted-foreground">
        {selector
          ? <><b className="text-foreground">{selector}</b>{me === selector ? " (you)" : ""} can set film number {turn} and deal the pick cards. Everyone else can watch.</>
          : "Nobody is designated, so anyone can set the week's film and deal cards."}
      </p>
      {canDesignate ? (
        <div className="flex flex-wrap items-center gap-2">
          <select className={fieldCls} aria-label="Who picks this week" value={name} onChange={e => setName(e.target.value)}>
            <option value="">Choose someone…</option>
            {members.map(n => <option key={n}>{n}</option>)}
          </select>
          <Button className="h-11 px-4" disabled={!name || name === selector} onClick={() => setSelector(name)}>Set selector</Button>
          {selector && <Button variant="ghost" className="h-11 px-4" onClick={() => setSelector(null)}>Let anyone pick</Button>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Only the host (who set up sealed ratings) can change this.</p>
      )}
    </Collapse>
  )
}
