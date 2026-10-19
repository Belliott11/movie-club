import { useState } from "react"
import { Lightbulb, LightbulbOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { flipLights, isDark } from "@/lib/theme"

/** Light/dark switch, worded like a cinema: lights down for dark, lights up for light. */
export function HouseLights() {
  const [dark, setDark] = useState(isDark)
  return (
    <Button type="button" variant="outline" className="h-10 gap-1.5 px-3" onClick={() => flipLights(t => setDark(t === "dark"))}>
      {dark ? <Lightbulb aria-hidden /> : <LightbulbOff aria-hidden />}
      {dark ? "Lights up" : "Lights down"}
    </Button>
  )
}
