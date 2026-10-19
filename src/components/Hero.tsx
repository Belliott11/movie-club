import type { ReactNode } from "react"
import { IMG } from "@/lib/api"
import type { Movie } from "@/lib/types"

/**
 * A widescreen frame: a still from one of the club's films between two black bars, with a grain over it.
 * The film's name sits on the bottom bar like the slate on a print. Without a still it is a plain dark gradient.
 */
export function Hero({ film, still, children }: { film?: Movie; still?: string | null; children: ReactNode }) {
  return (
    <div className="relative -mx-4 mb-5 overflow-hidden bg-black text-white sm:mx-0 sm:rounded-2xl">
      <div className="relative h-52 sm:h-64">
        <div className="grain absolute inset-x-0 inset-y-[8%] overflow-hidden">
          {still ? (
            <img
              src={`${IMG}w780${still}`}
              srcSet={`${IMG}w780${still} 780w, ${IMG}w1280${still} 1280w`}
              sizes="(min-width: 768px) 768px, 100vw"
              alt=""
              fetchPriority="high"
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full bg-linear-to-br from-[#161d36] to-[#3a2f7a]" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-black/45" />
          <div className="absolute inset-0 flex flex-col justify-between p-4">{children}</div>
        </div>
        {film && still && (
          <span className="absolute inset-x-4 bottom-[1.2%] truncate text-right text-[11px] leading-none text-white/65">
            Still from {film.title} ({film.year})
          </span>
        )}
      </div>
    </div>
  )
}
