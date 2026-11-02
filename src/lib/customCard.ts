import type { Card, CardDef, Cand } from "./deck"

const intl = new Intl.DisplayNames(["en"], { type: "region" })
const countryName = (code: string) => { try { return code === "US" ? "USA" : intl.of(code) ?? code } catch { return code } }
const langName = new Intl.DisplayNames(["en"], { type: "language" })

export const TAGS: Record<string, string> = { bw: "Black and white", silent: "Silent film", trueStory: "Based on a true story", franchise: "Part of a franchise", womanDirector: "Directed by a woman", lowBudget: "Low budget", book: "Based on a book", remake: "A remake", musical: "A musical", cannes: "Festival winner", indie: "Independent" }
export const GENRE_IDS: Record<string, number> = { Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80, Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36, Horror: 27, Music: 10402, Mystery: 9648, Romance: 10749, "Science Fiction": 878, Thriller: 53, War: 10752, Western: 37 }
export const LANG_CHOICES: [string, string][] = [["en", "English"], ["!en", "Not English"], ["fr", "French"], ["ja", "Japanese"], ["ko", "Korean"], ["es", "Spanish"], ["it", "Italian"], ["de", "German"], ["hi", "Hindi"], ["zh", "Chinese"], ["sv", "Swedish"], ["ru", "Russian"], ["pt", "Portuguese"], ["fa", "Persian"]]

/** True, false, or undefined when the film's facts don't say. */
const tri = <T,>(v: T | undefined | null, f: (v: T) => boolean) => (v == null ? undefined : f(v))

/** Whether a film meets every option on a custom card. Any option that fails rules it out; an option the facts can't answer leaves it unknown. */
export function customFits(def: CardDef, c: Cand): boolean | undefined {
  const f = def.f, out: (boolean | undefined)[] = []
  if (f.from != null) out.push(c.year >= f.from)
  if (f.to != null) out.push(c.year <= f.to)
  if (f.minRun != null) out.push(tri(c.runtime, r => r >= f.minRun!))
  if (f.maxRun != null) out.push(tri(c.runtime, r => r > 0 && r <= f.maxRun!))
  if (f.minRating != null) out.push(tri(c.rating, r => r >= f.minRating!))
  if (f.maxRating != null) out.push(tri(c.rating, r => r <= f.maxRating!))
  if (f.lang) out.push(tri(c.lang, l => (f.lang === "!en" ? l !== "en" : l === f.lang)))
  if (f.genre) out.push(tri(c.genres, g => g.includes(f.genre!)))
  if (f.country) out.push(tri(c.country, n => n === countryName(f.country!)))
  if (f.director) out.push(tri(c.directors, d => d.some(n => n.toLowerCase().includes(f.director!.toLowerCase()))))
  if (f.word) out.push(c.title.toLowerCase().includes(f.word.toLowerCase()))
  if (f.tag === "bw") out.push(c.bw)
  if (f.tag === "silent") out.push(c.silent)
  if (f.tag === "trueStory") out.push(c.trueStory)
  if (f.tag === "franchise") out.push(c.franchise)
  if (f.tag === "womanDirector") out.push(c.womanDirector)
  if (f.tag === "book") out.push(c.book)
  if (f.tag === "remake") out.push(c.remake)
  if (f.tag === "musical") out.push(c.musical)
  if (f.tag === "cannes") out.push(c.cannes)
  if (f.tag === "indie") out.push(c.independent)
  if (f.tag === "lowBudget") out.push(tri(c.budget, b => b < 5_000_000))
  if (!out.length) return undefined // a card with no options can't pick films for you
  if (out.includes(false)) return false
  return out.includes(undefined) ? undefined : true
}

/** A plain sentence for the options, used when the card's maker didn't write a rule. */
export function describeDef(def: CardDef): string {
  const f = def.f, bits: string[] = []
  if (f.from != null && f.to != null) bits.push(`made ${f.from} to ${f.to}`)
  else if (f.from != null) bits.push(`made in ${f.from} or later`)
  else if (f.to != null) bits.push(`made in ${f.to} or earlier`)
  if (f.minRun != null && f.maxRun != null) bits.push(`${f.minRun} to ${f.maxRun} minutes long`)
  else if (f.maxRun != null) bits.push(`${f.maxRun} minutes or shorter`)
  else if (f.minRun != null) bits.push(`${f.minRun} minutes or longer`)
  if (f.minRating != null && f.maxRating != null) bits.push(`rated ${f.minRating} to ${f.maxRating} out of 5`)
  else if (f.maxRating != null) bits.push(`rated ${f.maxRating} out of 5 or lower`)
  else if (f.minRating != null) bits.push(`rated ${f.minRating} out of 5 or higher`)
  if (f.lang) bits.push(f.lang === "en" ? "in English" : f.lang === "!en" ? "not in English" : `in ${langName.of(f.lang) ?? f.lang}`)
  if (f.genre) bits.push(`a ${f.genre.toLowerCase()} film`)
  if (f.country) bits.push(`from ${countryName(f.country)}`)
  if (f.director) bits.push(`directed by ${f.director}`)
  if (f.tag) bits.push(TAGS[f.tag].toLowerCase())
  if (f.word) bits.push(`with "${f.word}" in the title`)
  return bits.length ? bits[0].charAt(0).toUpperCase() + bits.join(", ").slice(1) + "." : "Up to you: no automatic matching."
}

/** A card the deck can deal, built from what its maker filled in. */
export function buildCard(def: CardDef): Card {
  return { id: def.id, title: def.title, rule: def.rule || describeDef(def), fits: c => customFits(def, c), custom: def }
}

export const cardId = (title: string) => `c-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24)}-${Date.now().toString(36)}`
