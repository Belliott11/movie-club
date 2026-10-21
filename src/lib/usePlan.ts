import { useCallback, useEffect, useState } from "react"
import { filmKey, parsePlan, type Plan } from "./plan"
import { lockKey, unlockKey } from "./seal"
import { useStore } from "./store"

const openKey = (m: string) => `plan-open:${m}`
const passKey = (m: string) => `plan-pass:${m}` // kept on this device so corrections can be saved without asking again
const readOpen = (m: string): Plan | null => { try { return JSON.parse(localStorage.getItem(openKey(m)) ?? "null") } catch { return null } }

/**
 * A person's private watching plan. The database only ever holds it locked with their passphrase; the unlocked copy lives on the
 * devices where they've entered it. "none" = no plan yet, "locked" = there is one but this device needs the passphrase, "open" = ready.
 */
export function usePlan(member: string | null) {
  const { planCipher, savePlanCipher } = useStore()
  const [plan, setPlan] = useState<Plan | null>(() => (member ? readOpen(member) : null))
  const [status, setStatus] = useState<"loading" | "none" | "locked" | "open">(() => (member && readOpen(member) ? "open" : "loading"))
  useEffect(() => {
    if (!member) { setPlan(null); setStatus("none"); return }
    const open = readOpen(member)
    if (open) { setPlan(open); setStatus("open"); return }
    setPlan(null)
    planCipher(member).then(c => setStatus(c ? "locked" : "none"))
  }, [member, planCipher])

  /** Reads pasted plan text, locks it with the passphrase and saves it. Returns false when the text has no groups. */
  const save = useCallback(async (text: string, pass: string) => {
    const parsed = parsePlan(text)
    if (!member || !parsed.groups.length) return false
    parsed.overrides = readOpen(member)?.overrides // a pasted replacement keeps your corrections
    await savePlanCipher(member, await lockKey(JSON.stringify(parsed), pass))
    localStorage.setItem(openKey(member), JSON.stringify(parsed))
    localStorage.setItem(passKey(member), pass)
    setPlan(parsed); setStatus("open")
    return true
  }, [member, savePlanCipher])

  /** Marks a film seen or not seen yourself (null goes back to what Letterboxd says). Saved locked, like the rest of the plan. */
  const setSeen = useCallback(async (f: { title: string; year?: number }, value: boolean | null) => {
    if (!member || !plan) return
    const overrides = { ...plan.overrides }
    if (value == null) delete overrides[filmKey(f)]
    else overrides[filmKey(f)] = value
    const next = { ...plan, overrides }
    localStorage.setItem(openKey(member), JSON.stringify(next))
    setPlan(next)
    const pass = localStorage.getItem(passKey(member))
    if (pass) await savePlanCipher(member, await lockKey(JSON.stringify(next), pass))
  }, [member, plan, savePlanCipher])

  const unlock = useCallback(async (pass: string) => {
    if (!member) return false
    const c = await planCipher(member)
    const text = c ? await unlockKey(c, pass) : null
    if (!text) return false
    localStorage.setItem(openKey(member), text)
    localStorage.setItem(passKey(member), pass)
    setPlan(JSON.parse(text)); setStatus("open")
    return true
  }, [member, planCipher])

  /** Removes the unlocked copy from this device. The locked plan stays in the database. */
  const lock = useCallback(() => { if (member) { localStorage.removeItem(openKey(member)); localStorage.removeItem(passKey(member)) }; setPlan(null); setStatus("locked") }, [member])
  /** Deletes the plan everywhere. */
  const remove = useCallback(async () => { if (member) { localStorage.removeItem(openKey(member)); localStorage.removeItem(passKey(member)); await savePlanCipher(member, null) } setPlan(null); setStatus("none") }, [member, savePlanCipher])
  return { plan, status, save, unlock, lock, remove, setSeen }
}
