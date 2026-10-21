import { useCallback, useEffect, useState } from "react"
import { parsePlan, type Plan } from "./plan"
import { lockKey, unlockKey } from "./seal"
import { useStore } from "./store"

const openKey = (m: string) => `plan-open:${m}`
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
    await savePlanCipher(member, await lockKey(JSON.stringify(parsed), pass))
    localStorage.setItem(openKey(member), JSON.stringify(parsed))
    setPlan(parsed); setStatus("open")
    return true
  }, [member, savePlanCipher])

  const unlock = useCallback(async (pass: string) => {
    if (!member) return false
    const c = await planCipher(member)
    const text = c ? await unlockKey(c, pass) : null
    if (!text) return false
    localStorage.setItem(openKey(member), text)
    setPlan(JSON.parse(text)); setStatus("open")
    return true
  }, [member, planCipher])

  /** Removes the unlocked copy from this device. The locked plan stays in the database. */
  const lock = useCallback(() => { if (member) localStorage.removeItem(openKey(member)); setPlan(null); setStatus("locked") }, [member])
  /** Deletes the plan everywhere. */
  const remove = useCallback(async () => { if (member) { localStorage.removeItem(openKey(member)); await savePlanCipher(member, null) } setPlan(null); setStatus("none") }, [member, savePlanCipher])
  return { plan, status, save, unlock, lock, remove }
}
