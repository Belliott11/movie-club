import { expect, test } from "vitest"
import { relativeDay } from "./today"

test("describes a film's date against today", () => {
  expect(relativeDay("2026-10-23", "2026-10-23")).toBe("tonight")
  expect(relativeDay("2026-10-24", "2026-10-23")).toBe("tomorrow")
  expect(relativeDay("2026-10-26", "2026-10-23")).toBe("in 3 days")
  expect(relativeDay("2026-10-22", "2026-10-23")).toBe("yesterday")
  expect(relativeDay("2026-10-18", "2026-10-23")).toBe("5 days ago")
  expect(relativeDay("2026-11-01", "2026-10-30")).toBe("in 2 days") // across a month end
})
