import { useEffect, useState } from "react"
import { Lock } from "lucide-react"
import { RevealOverlay } from "@/components/RevealOverlay"
import { StarRating } from "@/components/StarRating"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/store"
import type { Movie } from "@/lib/types"

/**
 * Rate in secret and reveal together. The host starts it for a film, everyone seals a score that only the host's device can open,
 * and the host reveals them all at once. Until then the scores can't be read by anyone else, even from the database.
 */
export function SealedPanel({ m }: { m: Movie }) {
  const { me, seal, isHost, loadSeal, sealSetup, sealUseKey, sealOpen, sealMine, sealedValue, sealReveal, sealCancel, members, attending } = useStore()
  const [pick, setPick] = useState<number | null>(null)
  const [backup, setBackup] = useState<string | null>(null)
  const [keyText, setKeyText] = useState("")
  const [keyBad, setKeyBad] = useState(false)
  const [revealed, setRevealed] = useState<{ member: string; value: number }[] | null>(null)
  const [busy, setBusy] = useState(false)
  const open = seal.openMovie === String(m.id)
  const mine = sealedValue(m)

  useEffect(() => { loadSeal() }, [loadSeal])
  // while sealing is open, check every few seconds who has sealed
  useEffect(() => {
    if (!open) return
    const t = setInterval(() => loadSeal(true), 8000)
    return () => clearInterval(t)
  }, [open, loadSeal])
  useEffect(() => { setPick(mine) }, [mine, m.id])

  if (!seal.ready && !revealed) return null
  const sealedNames = seal.sealedBy[String(m.id)] ?? []
  const everyone = [...new Set([...(attending.length ? attending : members.filter(n => m.ratings[n] != null)), ...sealedNames])]
  const waiting = everyone.filter(n => !sealedNames.includes(n))

  const offline = !seal.shared && (
    <p className="text-xs text-muted-foreground">Saved on this device only. Run the sealed-ratings part of schema.sql in Supabase to share it with everyone.</p>
  )

  let body = null
  if (!seal.publicKey) {
    body = (
      <>
        <p className="text-sm text-muted-foreground">Rate in secret, then reveal everyone's scores at once. One person sets it up and becomes the host who does the reveal.</p>
        {!backup && <Button variant="outline" className="h-11 w-fit px-4" onClick={async () => setBackup(await sealSetup())}>Set up sealed ratings and become the host</Button>}
        {offline}
      </>
    )
  } else if (!open) {
    body = isHost ? (
      <>
        <p className="text-sm text-muted-foreground">Everyone seals a score for {m.title}, and you open them all together.</p>
        <Button className="h-11 w-fit px-4" onClick={() => sealOpen(m)}>Start sealed ratings for {m.title}</Button>
        {offline}
      </>
    ) : (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Sealed ratings are set up. The host starts them for a film.</p>
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-2 text-muted-foreground">I'm the host on a different device</summary>
          <form className="flex flex-wrap gap-2" onSubmit={async e => { e.preventDefault(); setKeyBad(!(await sealUseKey(keyText))) }}>
            <Input value={keyText} onChange={e => setKeyText(e.target.value)} placeholder="Paste your reveal key" aria-label="Reveal key" className="h-10 min-w-48 flex-1 font-mono text-xs" />
            <Button type="submit" variant="outline" className="h-10 px-4">Use this key</Button>
            {keyBad && <p role="alert" className="w-full text-sm text-destructive">That key doesn't open this club's sealed scores.</p>}
          </form>
        </details>
      </div>
    )
  } else {
    body = (
      <>
        <p className="text-sm text-muted-foreground">Scores are sealed: only the host can open them. Nobody sees a number until the reveal.</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Who has sealed a score">
          {sealedNames.map(n => <li key={n} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm"><Lock className="size-3" aria-hidden />{n}</li>)}
          {waiting.map(n => <li key={n} className="rounded-full px-2.5 py-1 text-sm text-muted-foreground ring-1 ring-border">{n}</li>)}
        </ul>
        {me ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm text-muted-foreground">Your score</span>
            <StarRating label={`Your sealed score for ${m.title}`} value={pick} onChange={setPick} />
            <Button className="h-11 px-4" disabled={pick == null || pick === mine} onClick={() => pick != null && sealMine(m, pick)}>{mine == null ? "Seal my score" : "Change my sealed score"}</Button>
          </div>
        ) : <p className="text-sm text-muted-foreground">Pick your name at the top to seal a score.</p>}
        {mine != null && <p className="text-sm">Sealed at <b>{mine}</b>. Only you can see that.</p>}
        {isHost && (
          <div className="flex flex-wrap gap-2">
            <Button className="h-11 px-4" disabled={busy || sealedNames.length === 0} onClick={async () => { setBusy(true); setRevealed(await sealReveal(m)); setBusy(false) }}>
              Reveal all {sealedNames.length} {sealedNames.length === 1 ? "score" : "scores"}
            </Button>
            <Button variant="ghost" className="h-11 px-4" onClick={() => sealCancel(m)}>Cancel without revealing</Button>
          </div>
        )}
        {!isHost && <p className="text-xs text-muted-foreground">Waiting for the host to reveal.</p>}
        {offline}
      </>
    )
  }

  const backupBlock = backup && (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
      <p className="text-sm font-medium">You're the host. Back up your reveal key.</p>
      <p className="text-sm text-muted-foreground">It's saved on this device and it's the only thing that can open the sealed scores. If you lose it, they're gone.</p>
      <Input readOnly value={backup} aria-label="Reveal key" onFocus={e => e.currentTarget.select()} className="h-10 font-mono text-xs" />
      <div className="flex gap-2">
        <Button variant="outline" className="h-10 px-4" onClick={() => navigator.clipboard?.writeText(backup)}>Copy the key</Button>
        <Button variant="ghost" className="h-10 px-4" onClick={() => setBackup(null)}>I've saved it</Button>
      </div>
    </div>
  )
  body = <>{backupBlock}{body}</>
  const title = <><Lock className="size-4" aria-hidden />Sealed ratings</>
  return (
    <>
      {open ? (
        <div className="-mx-4 flex flex-col gap-3 border-t-2 border-dashed border-border px-4 pt-3">
          <h3 className="flex items-center gap-1.5 font-display text-lg font-bold">{title}</h3>
          {body}
        </div>
      ) : (
        <details className="-mx-4 border-t-2 border-dashed border-border px-4">
          <summary className="flex min-h-11 cursor-pointer items-center gap-1.5 py-2 font-display text-lg font-bold">{title}</summary>
          <div className="flex flex-col gap-3 pb-3">{body}</div>
        </details>
      )}
      {revealed && <RevealOverlay film={m.title} scores={revealed} onClose={() => setRevealed(null)} />}
    </>
  )
}
