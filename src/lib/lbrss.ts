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
    out.push([unescape(title), year, r >= 0.5 && r <= 5 ? r : null])
  }
  return out
}

/** Feed entries on top of an existing history. The feed is newer, so it wins; a feed film with no rating keeps an older rating. */
export function mergeHistory(old: LbEntry[], fresh: LbEntry[]): LbEntry[] {
  const m = new Map(old.map(e => [key(e[0], e[1]), e] as const))
  for (const e of fresh) {
    const had = m.get(key(e[0], e[1]))
    m.set(key(e[0], e[1]), [e[0], e[1], e[2] ?? had?.[2] ?? null])
  }
  return [...m.values()]
}

export async function fetchFeed(username: string): Promise<LbEntry[]> {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/lb-rss?u=${encodeURIComponent(username.trim())}`, { headers: { apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_KEY}` } })
  if (res.status === 404) throw new Error(`No public Letterboxd profile called "${username.trim()}".`)
  if (!res.ok) throw new Error("Couldn't reach Letterboxd. Check the lb-rss function is deployed in Supabase.")
  return parseRss(await res.text())
}
