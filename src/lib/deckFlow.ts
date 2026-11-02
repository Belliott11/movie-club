/** What the shared deck row holds: the cards dealt for one pick (a deal, then at most one redraw) and who dealt them. */
export type DeckRow = { turn: number; drawn: string[]; by?: string; at?: number }

export const MAX_DRAWS = 2

/** The cards on the table for this pick. A row left over from an earlier pick counts for nothing. */
export const drawnFor = (saved: DeckRow | null | undefined, turn: number): string[] => (saved && saved.turn === turn ? saved.drawn : [])

/** One redraw per pick, and only once a card has been dealt. */
export const canRedraw = (drawn: string[]) => drawn.length > 0 && drawn.length < MAX_DRAWS

/** The cards on the table after dealing `card`: a redraw adds to them, a fresh deal starts over. */
export const afterDeal = (drawn: string[], isRedraw: boolean, card: string) => [...(isRedraw ? drawn : []), card]

/** True when someone else changed the table since you looked, so your deal must not overwrite theirs. */
export const isStale = (seen: string[], now: string[]) => seen.length !== now.length || seen.some((c, i) => c !== now[i])

/** Whether you may deal: nobody is designated as selector, or you are. */
export const canDeal = (selector: string | null, me: string) => !selector || me === selector
