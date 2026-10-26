import { key } from "./stats"
import type { LbEntry } from "./letterboxd"

const tag = (item: string, name: string) => item.match(new RegExp(`<letterboxd:${name}>([^<]*)</letterboxd:${name}>`))?.[1]
const unescape = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")

/** Films in a Letterboxd diary feed: [title, year, rating or null]. List entries and anything without a film are skipped. */
export function parseRss(xml: string): LbEntry[] {
  const out: LbEntry[] = []
  for (const item of xml.split("<item>").slice(1)) {
    const title = tag(item, "filmTitle"), year = parseInt(tag(item, "filmYear") ?? "")
    if (!title || !year) continue
    const r = parseFloat(tag(item, "memberRating") ?? "")
    const day = tag(item, "watchedDate")
    const rating = r >= 0.5 && r <= 5 ? r : null
    out.push(day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? [unescape(title), year, rating, day, [day]] : [unescape(title), year, rating])
  }
  return out
}

/** Feed entries on top of an existing history. The feed is newer, so it wins; a feed film with no rating keeps an older rating. */
export function mergeHistory(old: LbEntry[], fresh: LbEntry[]): LbEntry[] {
  const m = new Map(old.map(e => [key(e[0], e[1]), e] as const))
  for (const e of fresh) {
    const had = m.get(key(e[0], e[1]))
    const w = [...new Set([...(had?.[4] ?? []), ...(e[4] ?? [])])].sort() // every real watch, old and new
    const day = w.length ? w[w.length - 1] : e[3] ?? had?.[3]
    const rating = e[2] ?? had?.[2] ?? null
    m.set(key(e[0], e[1]), w.length ? [e[0], e[1], rating, day, w] : day ? [e[0], e[1], rating, day] : [e[0], e[1], rating])
  }
  return [...m.values()]
}

export async function fetchFeed(username: string): Promise<LbEntry[]> {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/lb-rss?u=${encodeURIComponent(username.trim())}`, { headers: { apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_KEY}` } })
  if (res.status === 404) throw new Error(`No public Letterboxd profile called "${username.trim()}".`)
  if (!res.ok) throw new Error("Couldn't reach Letterboxd. Check the lb-rss function is deployed in Supabase.")
  return parseRss(await res.text())
}

/** Films on one page of a public Letterboxd watchlist, read from the page's poster markup ("Title (2024)"). Films without a year are skipped. */
export function parseWatchlistPage(html: string): { title: string; year: number }[] {
  const out: { title: string; year: number }[] = []
  for (const m of html.matchAll(/data-item-name="([^"]*)"/g)) {
    const t = unescape(m[1].replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))).match(/^(.*) \((\d{4})\)$/)
    if (t) out.push({ title: t[1], year: +t[2] })
  }
  return out
}

/** A person's whole public watchlist, one page at a time (28 films each), stopping at the first empty page. */
export async function fetchWatchlist(username: string): Promise<{ title: string; year: number }[]> {
  const all = new Map<string, { title: string; year: number }>()
  for (let page = 1; page <= 40; page++) {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/lb-rss?u=${encodeURIComponent(username.trim())}&watchlist=${page}`, { headers: { apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_KEY}` } })
    if (!res.ok) throw new Error("Couldn't read your Letterboxd watchlist.")
    const films = parseWatchlistPage(await res.text())
    if (!films.length) break
    for (const f of films) all.set(key(f.title, f.year), f)
  }
  return [...all.values()]
}
