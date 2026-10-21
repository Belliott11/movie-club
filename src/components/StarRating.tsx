import { Star } from "lucide-react"

/**
 * Five stars, half-star steps. Tap the left half of a star for x.5, the right half for the whole star.
 * Tapping the current rating again clears it.
 */
export function StarRating({ value, onChange, label }: { value: number | null; onChange: (v: number | null) => void; label: string }) {
  const set = (v: number) => onChange(v === value ? null : v)
  return (
    <div role="group" aria-label={label} className="flex items-center">
      {[1, 2, 3, 4, 5].map(i => {
        const fill = value == null ? 0 : value >= i ? 1 : value >= i - 0.5 ? 0.5 : 0
        return (
          <span key={i} className="relative size-11">
            <Star className="absolute inset-1.5 size-8 text-border" strokeWidth={1.5} />
            <span key={fill} className={`absolute inset-y-1.5 left-1.5 overflow-hidden ${fill ? "pop" : ""}`} style={{ width: `${fill * 2}rem`, transformOrigin: "left center" }} aria-hidden>
              <Star className="size-8 fill-sun text-sun" strokeWidth={1.5} />
            </span>
            <button type="button" aria-label={`${i - 0.5} stars`} aria-pressed={value === i - 0.5} className="absolute inset-y-0 left-0 w-1/2 rounded-l-lg bg-transparent" onClick={() => set(i - 0.5)} />
            <button type="button" aria-label={`${i} ${i === 1 ? "star" : "stars"}`} aria-pressed={value === i} className="absolute inset-y-0 right-0 w-1/2 rounded-r-lg bg-transparent" onClick={() => set(i)} />
          </span>
        )
      })}
    </div>
  )
}
