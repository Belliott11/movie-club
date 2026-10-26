import { useState, type ChangeEvent } from "react"
import { Avatar } from "@/components/Avatar"
import { Collapse } from "@/components/Collapse"
import { fieldCls } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { download } from "@/lib/exporters"
import { isUnused } from "@/lib/people"
import { useStore } from "@/lib/store"

const STARS = Array.from({ length: 10 }, (_, i) => (i + 1) / 2)
const personHref = (n: string) => `#/people/${encodeURIComponent(n)}`

function PersonRow({ name }: { name: string }) {
  const { movies, watchlist, suggestions, renameMember, removeMember, noLb, setNoLb } = useStore()
  const [editing, setEditing] = useState(false)
  const [to, setTo] = useState(name)
  if (editing) {
    return (
      <form className="flex flex-wrap items-center gap-2 px-4 py-1" onSubmit={e => { e.preventDefault(); if (to.trim() && to.trim() !== name) renameMember(name, to); setEditing(false) }}>
        <Input value={to} onChange={e => setTo(e.target.value)} aria-label={`New name for ${name}`} autoFocus className="h-10 w-44" />
        <Button type="submit" className="h-10 px-4">Save</Button>
        <Button type="button" variant="ghost" className="h-10 px-3" onClick={() => setEditing(false)}>Cancel</Button>
      </form>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2 px-4 py-1">
      <a className="flex min-h-11 min-w-0 flex-1 items-center gap-2 font-medium hover:underline" href={personHref(name)}><Avatar name={name} size="sm" />{name}</a>
      <label className="flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" className="size-4" checked={noLb.includes(name)} onChange={e => setNoLb(name, e.target.checked)} />No Letterboxd</label>
      <Button variant="ghost" className="h-10 px-3" onClick={() => { setTo(name); setEditing(true) }}>Rename or merge</Button>
      {isUnused(name, movies, watchlist, suggestions) && <Button variant="ghost" className="h-10 px-3 text-destructive" onClick={() => removeMember(name)}>Remove</Button>}
    </div>
  )
}

function Ratings() {
  const { movies, members, setRating } = useStore()
  const [who, setWho] = useState("")
  const person = who || members[0] || ""
  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">Change or clear anyone's rating. Each change can be undone from the message at the bottom.</p>
      <select className={fieldCls} aria-label="Whose ratings" value={person} onChange={e => setWho(e.target.value)}>{members.map(n => <option key={n}>{n}</option>)}</select>
      <ul className="mt-2 flex flex-col divide-y divide-border">
        {[...movies].sort((a, b) => a.seq - b.seq).map(m => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-1">
            <span className="min-w-0 truncate">{m.seq}. {m.title} <small className="text-muted-foreground">{m.year}</small></span>
            <select aria-label={`${person}'s rating of ${m.title}`} className={`${fieldCls} w-24 shrink-0`} value={m.ratings[person] ?? ""} onChange={e => setRating(m, person, e.target.value === "" ? null : +e.target.value)}>
              <option value="">–</option>
              {STARS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </li>
        ))}
      </ul>
    </>
  )
}

function Films() {
  const { movies, deleteMovie } = useStore()
  const [sure, setSure] = useState<number | null>(null)
  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">Open a film to edit its title, year or pick. Only you can edit or delete films; a deleted film can be brought back from the message at the bottom.</p>
      <ul className="flex flex-col divide-y divide-border">
        {[...movies].sort((a, b) => a.seq - b.seq).map(m => (
          <li key={m.id} className="flex flex-wrap items-center gap-x-2 py-1">
            <a href={`#/films/${m.id}`} className="min-h-11 min-w-0 flex-1 content-center truncate hover:underline">{m.seq}. {m.title} <small className="text-muted-foreground">{m.year} · {m.pick}</small></a>
            {sure === m.id ? (
              <>
                <Button variant="destructive" className="h-10 px-3" onClick={() => { deleteMovie(m); setSure(null) }}>Delete with {Object.keys(m.ratings).length} ratings</Button>
                <Button variant="ghost" className="h-10 px-3" onClick={() => setSure(null)}>Keep</Button>
              </>
            ) : <Button variant="ghost" className="h-10 px-3 text-destructive" onClick={() => setSure(m.id as number)}>Delete</Button>}
          </li>
        ))}
      </ul>
    </>
  )
}

function Suggestions() {
  const { suggestions, removeSuggestion } = useStore()
  if (!suggestions.length) return <p className="text-muted-foreground">No suggestions right now.</p>
  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {suggestions.map(s => (
          <li key={s.id} className="flex items-center gap-2 py-1">
            <span className="min-w-0 flex-1 truncate">{s.title} <small className="text-muted-foreground">{s.year ?? ""} · {s.by}, {s.votes.length} {s.votes.length === 1 ? "vote" : "votes"}</small></span>
            <Button variant="ghost" className="h-10 px-3 text-destructive" onClick={() => removeSuggestion(s)}>Remove</Button>
          </li>
        ))}
      </ul>
      <Button variant="outline" className="mt-2 h-11 px-4" onClick={() => { if (confirm(`Remove all ${suggestions.length} suggestions?`)) suggestions.forEach(removeSuggestion) }}>Clear all</Button>
    </>
  )
}

function Backup() {
  const { backup, restore, shared } = useStore()
  const [msg, setMsg] = useState("")
  const save = async () => {
    setMsg("Collecting everything…")
    const data = await backup()
    download(`movie-club-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exported: new Date().toISOString(), data }, null, 1), "application/json")
    setMsg(`Saved ${Object.values(data).reduce((n, rows) => n + rows.length, 0)} rows.`)
  }
  const load = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    try {
      const { data } = JSON.parse(await f.text())
      if (!data || typeof data !== "object") throw new Error("That isn't a Movie Club backup.")
      if (!confirm("Put everything in this backup back? Ratings, takes, watchlists, settings and people in the file overwrite what's there now. Nothing is deleted.")) return
      setMsg("Restoring…")
      setMsg(`Restored ${await restore(data)} rows.`)
    } catch (err) { setMsg((err as Error).message) }
  }
  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">A full copy of the club's data: films, ratings, takes, watchlists, suggestions, people, Letterboxd histories, settings and sealed scores (those stay locked). Keep it somewhere safe.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button className="h-11 px-4" onClick={save}>Download backup</Button>
        {shared && (
          <label className="inline-flex h-11 cursor-pointer items-center rounded-lg border border-border px-4 text-sm font-medium focus-within:ring-3 focus-within:ring-ring/50">
            Restore from backup<input type="file" accept=".json,application/json" className="sr-only" onChange={load} />
          </label>
        )}
      </div>
      {shared && <p className="mt-2 text-xs text-muted-foreground">Restore brings back ratings, takes, watchlists, people, settings and histories for films that still exist. A deleted film comes back with Undo right after you delete it, not from a backup.</p>}
      {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
    </>
  )
}

/** The host's tools: who is in the club, anyone's ratings, the films, suggestions, and backups. Only shown to the host. */
export function AdminPanel() {
  const { members, canDesignate } = useStore()
  if (!canDesignate) return null
  return (
    <Collapse id="me-admin" title="Admin" defaultOpen={false}>
      <div className="flex flex-col gap-3">
        <Collapse id="admin-people" title="People" defaultOpen={false}>
          <p className="mb-2 text-sm text-muted-foreground">Rename someone, or type an existing name to merge two spellings. Ratings, picks, watchlists and votes move over. Tick "No Letterboxd" and the site stops asking them to import.</p>
          <Card className="gap-0 py-1">{members.map(n => <PersonRow key={n} name={n} />)}</Card>
        </Collapse>
        <Collapse id="admin-ratings" title="Ratings" defaultOpen={false}><Ratings /></Collapse>
        <Collapse id="admin-films" title="Films" defaultOpen={false}><Films /></Collapse>
        <Collapse id="admin-suggestions" title="Suggestions" defaultOpen={false}><Suggestions /></Collapse>
        <Collapse id="admin-backup" title="Backup and restore" defaultOpen={false}><Backup /></Collapse>
      </div>
    </Collapse>
  )
}
