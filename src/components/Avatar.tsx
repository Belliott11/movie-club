const HUES = [25, 60, 100, 155, 195, 240, 290, 335]

/** The same name always gets the same hue, so a person is recognisable across pages. */
export const hueOf = (name: string) => {
  let h = 0
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return HUES[h % HUES.length]
}

const SIZES = { sm: "size-7 text-xs", md: "size-10 text-base", lg: "size-20 text-3xl" } as const

/** Initial in a colored circle. Decorative: the name is always written next to it. */
export function Avatar({ name, size = "md", className = "" }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ${SIZES[size]} ${className}`}
      style={{ background: `oklch(0.52 0.15 ${hueOf(name)})` }}
    >
      {(name.trim()[0] || "?").toUpperCase()}
    </span>
  )
}
