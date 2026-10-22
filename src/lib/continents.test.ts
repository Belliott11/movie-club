import { expect, test } from "vitest"
import { CONTINENTS, continentOfCode, continentOfName } from "./continents"

test("country codes map to continents, case-insensitively, including former countries", () => {
  expect(continentOfCode("JP")).toBe("Asia")
  expect(continentOfCode("br")).toBe("South America")
  expect(continentOfCode("US")).toBe("North America")
  expect(continentOfCode("NG")).toBe("Africa")
  expect(continentOfCode("NZ")).toBe("Oceania")
  expect(continentOfCode("SU")).toBe("Europe") // the Soviet Union
  expect(continentOfCode("ZZ")).toBeUndefined()
  expect(continentOfCode(undefined)).toBeUndefined()
})

test("country names as the site writes them map too, and the border cases land where expected", () => {
  expect(continentOfName("USA")).toBe("North America")
  expect(continentOfName("Japan")).toBe("Asia")
  expect(continentOfName("France")).toBe("Europe")
  expect(continentOfName("Atlantis")).toBeUndefined()
  expect(continentOfCode("RU")).toBe("Europe")
  expect(continentOfCode("TR")).toBe("Asia")
  expect(CONTINENTS).toHaveLength(6)
})
