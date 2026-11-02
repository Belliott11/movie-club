// Fetches the big "top films" lists from their public Letterboxd copies and writes public/lists.json for the site's list cards.
// The lists are community copies of the published rankings; run it again whenever a list is updated:  npm run lists
import { writeFileSync } from "node:fs"

const LISTS = [
  { id: "tspdt", name: "They Shoot Pictures' 1,000 Greatest Films", short: "TSPDT 1,000", url: "tspdtfanaccount/list/the-1000-greatest-films-21st-edition-2026" },
  { id: "lb500", name: "Letterboxd's Top 500", short: "Letterboxd Top 500", url: "official/list/letterboxds-top-500-films" },
  { id: "sns", name: "Sight and Sound's Greatest Films of All Time (2022)", short: "Sight and Sound 2022", url: "sightsoundmag/list/sight-and-sounds-greatest-films-of-all-time" },
  { id: "imdb", name: "IMDb's Top 250", short: "IMDb Top 250", url: "dave/list/imdb-top-250" },
  { id: "afi", name: "AFI's 100 Years...100 Movies", short: "AFI 100", url: "afi/list/afis-100-years100-movies-10th-anniversary" },
]

const unescape = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function page(url, n) {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`https://letterboxd.com/${url}/page/${n}/`, { headers: { "User-Agent": "Mozilla/5.0 movie-club-friends/1.0" } })
    if (res.status === 404) return null
    if (res.ok) return res.text()
    await sleep(1500 * (i + 1))
  }
  return null
}

const out = []
for (const list of LISTS) {
  const films = [], seen = new Set()
  for (let n = 1; n <= 40; n++) {
    const html = await page(list.url, n)
    if (!html) break
    const found = [...html.matchAll(/data-item-name="([^"]*)"/g)].map(m => unescape(m[1]).match(/^(.*) \((\d{4})\)$/)).filter(Boolean).map(m => [m[1], +m[2]])
    const fresh = found.filter(([t, y]) => !seen.has(`${t}|${y}`))
    if (!fresh.length) break
    for (const f of fresh) { seen.add(`${f[0]}|${f[1]}`); films.push(f) }
    await sleep(500)
  }
  console.log(`${list.short}: ${films.length} films`)
  out.push({ id: list.id, name: list.name, short: list.short, films })
}
writeFileSync("public/lists.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), lists: out }))
