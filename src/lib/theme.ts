/** Palettes the Theme menu offers. "cinema" is the default look in index.css; the others live in themes.css under html[data-theme]. `sw` is [background, club, everyone else, standout] for the swatch. */
export const THEMES = [
  { id: "cinema", label: "Cinema", sw: ["#14110e", "#ff6a4d", "#4cc3cf", "#f7be3a"] },
  { id: "purple", label: "Purple", sw: ["#070b19", "#ff4da0", "#36d3f2", "#ffd23f"] },
  { id: "noir", label: "Noir", sw: ["#0d0d0d", "#ff5a4a", "#9fb0bf", "#f0c040"] },
  { id: "forest", label: "Forest", sw: ["#0f1710", "#ff8a5c", "#5fd0a0", "#f2c14e"] },
  { id: "ocean", label: "Ocean", sw: ["#08141f", "#ff7458", "#52bff0", "#f7be3a"] },
  { id: "sunset", label: "Sunset", sw: ["#1a0f0b", "#ff7a3d", "#5cc0e0", "#ffb84d"] },
] as const
export const MODES = [["auto", "Match device"], ["light", "Light"], ["dark", "Dark"]] as const

/** Sets the palette and light/dark on the page. index.html defines this before the app loads so there is no flash. */
export const applyTheme = (theme: string, mode: string) => (window as any).__applyTheme?.(theme, mode)
