/** A grey block that pulses while the real thing loads, so the page keeps its shape instead of jumping. */
export const Skeleton = ({ className = "" }: { className?: string }) => <span aria-hidden className={`block animate-pulse rounded-md bg-muted ${className}`} />

/** Placeholder film cards (poster and three lines) in the same grid the real cards use. */
export function CardSkeletons({ n = 8 }: { n?: number }) {
  return (
    <ul role="status" aria-label="Loading films" className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </li>
      ))}
    </ul>
  )
}

/** A few lines of text still loading. */
export const TextSkeleton = () => (
  <div role="status" aria-label="Loading details" className="flex max-w-[62ch] flex-col gap-2">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
  </div>
)
