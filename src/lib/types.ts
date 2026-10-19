export type Id = string | number
export type Movie = {
  id: Id; seq: number; title: string; year: number; pick: string
  tmdb_id?: number | null; imdb?: number | null; rt?: number | null; mc?: number | null; lb?: number | null
  ratings: Record<string, number>
}
export type WatchItem = { member: string; title: string; year: number }
export type Suggestion = { id: Id; title: string; year: number | null; by: string; votes: string[] }
export type Mini = { p: string | null; v: number | null; b?: string | null }
export type RecFlag = { member: string; tmdb_id: number; kind: "seen" | "skip" }
