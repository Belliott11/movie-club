/**
 * Title lettering borrowed from famous films. Each preset sets three faces: the site title, the headings, and the small typewriter-style labels.
 * The faces are the nearest free Google Fonts to the originals (Futura, Eurostile, Trajan and so on), loaded only when a preset needs them.
 */
export type FontPreset = {
  id: string
  label: string
  from: string
  title: string
  heading: string
  label2: string
  /** font-weight for headings; single-weight display faces need 400 so the browser doesn't fake a bold */
  weight: number
  /** letter-spacing for headings */
  track: string
  /** Google Fonts family parameters to load */
  load: string[]
}

export const FONT_PRESETS: FontPreset[] = [
  { id: "classic", label: "Classic", from: "The site's own headings", title: '"Bricolage Grotesque"', heading: '"Bricolage Grotesque"', label2: '"Public Sans"', weight: 700, track: "0", load: [] },
  { id: "poster", label: "Poster", from: "Bebas Neue, the one-sheet look", title: '"Bebas Neue"', heading: '"Bebas Neue"', label2: '"Courier Prime"', weight: 400, track: "0.02em", load: ["Bebas+Neue", "Courier+Prime"] },
  { id: "hollywood", label: "Hollywood", from: "Trajan, on a thousand posters", title: '"Cinzel"', heading: '"Cinzel"', label2: '"Courier Prime"', weight: 700, track: "0.01em", load: ["Cinzel:wght@600;800", "Courier+Prime"] },
  { id: "kubrick", label: "Kubrick", from: "Futura, as in Wes Anderson and Kubrick", title: '"Jost"', heading: '"Jost"', label2: '"Jost"', weight: 600, track: "0.015em", load: ["Jost:wght@500;600;800"] },
  { id: "space", label: "Space", from: "Eurostile, as in 2001 and Alien", title: '"Michroma"', heading: '"Michroma"', label2: '"Michroma"', weight: 400, track: "0.03em", load: ["Michroma"] },
  { id: "screenplay", label: "Screenplay", from: "Courier, the script page", title: '"Courier Prime"', heading: '"Courier Prime"', label2: '"Courier Prime"', weight: 700, track: "0", load: ["Courier+Prime:wght@400;700"] },
  { id: "typewriter", label: "Typewriter", from: "Special Elite, case files and Se7en", title: '"Special Elite"', heading: '"Special Elite"', label2: '"Special Elite"', weight: 400, track: "0", load: ["Special+Elite"] },
  { id: "silent", label: "Silent film", from: "Intertitle cards", title: '"Old Standard TT"', heading: '"Old Standard TT"', label2: '"Old Standard TT"', weight: 700, track: "0", load: ["Old+Standard+TT:ital,wght@0,400;0,700;1,400"] },
  { id: "deco", label: "Noir deco", from: "Limelight, 1930s and 40s titles", title: '"Limelight"', heading: '"Limelight"', label2: '"Courier Prime"', weight: 400, track: "0.01em", load: ["Limelight", "Courier+Prime"] },
  { id: "western", label: "Western", from: "Rye, saloon posters", title: '"Rye"', heading: '"Alfa Slab One"', label2: '"Courier Prime"', weight: 400, track: "0", load: ["Rye", "Alfa+Slab+One", "Courier+Prime"] },
  { id: "marquee", label: "Marquee", from: "Bungee, theater signs", title: '"Bungee"', heading: '"Bungee"', label2: '"Courier Prime"', weight: 400, track: "0", load: ["Bungee", "Courier+Prime"] },
]
export const DEFAULT_FONTS = "classic"

const loaded = new Set<string>()
const loadFamilies = (families: string[]) => {
  const fresh = families.filter(f => !loaded.has(f))
  if (!fresh.length) return
  fresh.forEach(f => loaded.add(f))
  const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: `https://fonts.googleapis.com/css2?${fresh.map(f => `family=${f}`).join("&")}&display=swap` })
  document.head.append(link)
}

/** Puts a preset's faces on the page. Unknown ids fall back to the default. */
export function applyFonts(id: string) {
  const p = FONT_PRESETS.find(x => x.id === id) ?? FONT_PRESETS.find(x => x.id === DEFAULT_FONTS)!
  loadFamilies(p.load)
  const h = document.documentElement, s = h.style
  // the classic preset leaves the stylesheet's own fonts alone, so the site looks exactly as it did before presets existed
  if (p.id === "classic") { ["--f-title", "--f-heading", "--f-label", "--f-weight", "--f-track"].forEach(v => s.removeProperty(v)); delete h.dataset.fonts; return }
  h.dataset.fonts = p.id
  s.setProperty("--f-title", `${p.title}, "Bricolage Grotesque", sans-serif`)
  s.setProperty("--f-heading", `${p.heading}, "Bricolage Grotesque", sans-serif`)
  s.setProperty("--f-label", `${p.label2}, ui-monospace, monospace`)
  s.setProperty("--f-weight", String(p.weight))
  s.setProperty("--f-track", p.track)
}

/** Loads every preset's faces so the menu can show each name in its own lettering. */
export const loadAllFonts = () => loadFamilies(FONT_PRESETS.flatMap(p => p.load))

export const savedFonts = () => { try { return JSON.parse(localStorage.getItem("fonts-v1") ?? "null") ?? DEFAULT_FONTS } catch { return DEFAULT_FONTS } }
