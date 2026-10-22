import { expect, test } from "vitest"
import { CONTINENTS, REGIONS, continentOfCode, continentOfName, regionOfCode, regionOfName } from "./continents"

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

test("regions slice the continents finer, and every country the site knows has both", () => {
  expect(regionOfCode("JP")).toBe("East Asia")
  expect(regionOfCode("TH")).toBe("Southeast Asia")
  expect(regionOfCode("IN")).toBe("South Asia")
  expect(regionOfCode("IR")).toBe("Middle East and Central Asia")
  expect(regionOfCode("SE")).toBe("Nordic countries")
  expect(regionOfCode("IT")).toBe("Southern Europe")
  expect(regionOfCode("PL")).toBe("Eastern Europe and the Balkans")
  expect(regionOfCode("BR")).toBe("Latin America and the Caribbean")
  expect(regionOfCode("NG")).toBe("Sub-Saharan Africa")
  expect(regionOfCode("EG")).toBe("North Africa")
  expect(regionOfName("USA")).toBe("US and Canada")
  expect(regionOfName("Japan")).toBe("East Asia")
  expect(REGIONS).toHaveLength(13)
  for (const code of ["US", "JP", "FR", "BR", "NG", "AU", "RU", "TR", "SU", "CZ", "HK"]) expect(continentOfCode(code) && regionOfCode(code), code).toBeTruthy()
})
