import { expect, test } from "vitest"
import { newSealKeys, openScore, sealScore } from "./seal"

test("a sealed score opens with the host's key and round-trips every half star", async () => {
  const { publicKey, privateKey } = await newSealKeys()
  for (const score of [0.5, 2.5, 3, 4.5, 5]) {
    expect(await openScore(privateKey, await sealScore(publicKey, score))).toBe(score)
  }
})

test("nobody else can open it: a different key gets nothing, and the same score seals differently each time", async () => {
  const host = await newSealKeys(), other = await newSealKeys()
  const a = await sealScore(host.publicKey, 4), b = await sealScore(host.publicKey, 4)
  expect(a).not.toBe(b) // so identical scores can't be spotted by comparing what's stored
  expect(await openScore(other.privateKey, a)).toBeNull()
  expect(await openScore(host.privateKey, "not a real sealed value")).toBeNull()
})

test("anything that isn't a half-star rating comes back null, even with the right key", async () => {
  const { publicKey, privateKey } = await newSealKeys()
  for (const bad of [0, 7, 3.3, -1]) expect(await openScore(privateKey, await sealScore(publicKey, bad))).toBeNull()
})
