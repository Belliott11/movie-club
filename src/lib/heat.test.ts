import { expect, test } from "vitest"
import { heatTint } from "./heat"

test("low values tint magenta, high cyan, and the middle fades out", () => {
  expect(heatTint(1, 1, 5)).toEqual({ side: "low", pct: 40 })
  expect(heatTint(5, 1, 5)).toEqual({ side: "high", pct: 40 })
  expect(heatTint(3, 1, 5).pct).toBe(0)
  expect(heatTint(4, 1, 5)).toEqual({ side: "high", pct: 20 })
})
test("values outside the scale are clamped and a flat scale does not divide by zero", () => {
  expect(heatTint(99, 1, 5).pct).toBe(40)
  expect(heatTint(-3, 1, 5)).toEqual({ side: "low", pct: 40 })
  expect(heatTint(2, 2, 2).pct).toBe(0)
})
