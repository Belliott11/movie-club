import { useState, type FormEvent } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/store"

/** One-line "add a person" form. Calls onAdded with the (possibly already existing) name. */
export function AddPerson({ onAdded, label = "Add a person", autoFocus = false }: { onAdded?: (name: string) => void; label?: string; autoFocus?: boolean }) {
  const { addMember } = useStore()
  const [name, setName] = useState("")
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const n = await addMember(name)
    if (n) { setName(""); onAdded?.(n) }
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="First name" aria-label="Name" autoFocus={autoFocus} className="h-10 w-40" />
      <Button type="submit" variant="outline" className="h-10 gap-1.5 px-3" disabled={!name.trim()}>
        <UserPlus /> {label}
      </Button>
    </form>
  )
}
