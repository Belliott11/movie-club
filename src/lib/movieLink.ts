/** Where a film's info page lives. Any film works, whether or not the club has played it; the page sends club films on to their own page. */
export const movieHref = (title: string, year?: number | null) => `#/movie/${encodeURIComponent(title)}/${year || 0}`
