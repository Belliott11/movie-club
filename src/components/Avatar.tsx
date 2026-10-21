import { useState } from "react"

const HUES = [15, 40, 70, 105, 150, 190, 220, 250]

/** The same name always gets the same hue, so a person is recognisable across pages. */
export const hueOf = (name: string) => {
  let h = 0
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return HUES[h % HUES.length]
}

// Photos live in public/people/<first name in lowercase>.jpg. Anyone else (new members) gets a colored initial.
const PHOTOS = new Set(["adam", "alex", "ben", "jason", "kayla", "michael", "phillip", "reilly", "viraj", "will", "zach"])
const slug = (name: string) => name.trim().toLowerCase()

const SIZES = { xs: "size-5 text-[10px]", sm: "size-7 text-xs", md: "size-10 text-base", lg: "size-20 text-3xl" } as const

/** A person's photo, or their initial in a colored circle when there isn't one. Decorative: the name is always written next to it. */
export function Avatar({ name, size = "md", className = "" }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  const [broken, setBroken] = useState(false)
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${SIZES[size]} ${className}`
  if (PHOTOS.has(slug(name)) && !broken) {
    return <img aria-hidden alt="" src={`${import.meta.env.BASE_URL}people/${slug(name)}.jpg`} onError={() => setBroken(true)} className={`${base} bg-muted object-cover`} />
  }
  return (
    <span aria-hidden className={`${base} font-display font-bold text-white`} style={{ background: `oklch(0.52 0.15 ${hueOf(name)})` }}>
      {(name.trim()[0] || "?").toUpperCase()}
    </span>
  )
}
