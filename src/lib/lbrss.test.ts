import { expect, test } from "vitest"
import { mergeHistory, parseRss } from "./lbrss"

const feed = `<rss><channel>
<item><title>Heat, 1995 - ★★★★</title><letterboxd:filmTitle>Heat</letterboxd:filmTitle><letterboxd:filmYear>1995</letterboxd:filmYear><letterboxd:memberRating>4.0</letterboxd:memberRating></item>
<item><title>Seen only</title><letterboxd:filmTitle>Tom &amp; Jerry</letterboxd:filmTitle><letterboxd:filmYear>2021</letterboxd:filmYear></item>
<item><title>My list</title><link>x</link></item>
</channel></rss>`

test("reads title, year and rating from diary entries and skips lists", () => {
  expect(parseRss(feed)).toEqual([["Heat", 1995, 4], ["Tom & Jerry", 2021, null]])
})

test("the feed updates ratings and adds films, but an unrated entry keeps the old rating", () => {
  const merged = mergeHistory([["Heat", 1995, 3], ["Alien", 1979, 5], ["Tom & Jerry", 2021, 2]], parseRss(feed))
  expect(merged).toEqual(expect.arrayContaining([["Heat", 1995, 4], ["Alien", 1979, 5], ["Tom & Jerry", 2021, 2]]))
  expect(merged).toHaveLength(3)
})

import { parseWatchlistPage } from "./lbrss"
import { expect as ex, it as t } from "vitest"
t("reads film names and years off a watchlist page", () => {
  const html = '<div data-item-name="Big World (2024)"></div><div data-item-name="Amélie &amp; Co (2001)"></div><div data-item-name="No Year"></div>'
  ex(parseWatchlistPage(html)).toEqual([{ title: "Big World", year: 2024 }, { title: "Amélie & Co", year: 2001 }])
})
