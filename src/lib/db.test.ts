import { afterEach, expect, test, vi } from "vitest"
import { createDb } from "./db"

type Call = { url: string; method: string; headers: Record<string, string>; body?: string }
const calls: Call[] = []
const reply = (status: number, json: unknown) => vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
  calls.push({ url, method: String(init.method), headers: init.headers as Record<string, string>, body: init.body as string | undefined })
  return new Response(json == null ? "" : JSON.stringify(json), { status })
}))
const db = createDb({ url: "https://x.supabase.co", key: "KEY", code: () => "club" })
afterEach(() => { calls.length = 0; vi.unstubAllGlobals() })

test("a read asks for the columns and filters, and sends the key and the club code", async () => {
  reply(200, [{ key: "a", value: "1" }])
  const r = await db.from("club_settings").select("key,value").eq("key", "plan:Ben Z")
  expect(r).toEqual({ data: [{ key: "a", value: "1" }], error: null })
  expect(calls[0].url).toBe("https://x.supabase.co/rest/v1/club_settings?select=key%2Cvalue&key=eq.plan%3ABen%20Z")
  expect(calls[0].headers).toMatchObject({ apikey: "KEY", Authorization: "Bearer KEY", "x-club-code": "club" })
})

test("writes use the right verbs and preferences; insert().select().single() returns the row", async () => {
  reply(201, { id: 7 })
  const r = await db.from("movies").insert({ title: "X" }).select().single()
  expect(r.data).toEqual({ id: 7 })
  expect(calls[0].method).toBe("POST")
  expect(calls[0].headers.Prefer).toBe("return=representation")
  expect(calls[0].headers.Accept).toBe("application/vnd.pgrst.object+json")
  reply(204, null)
  await db.from("ratings").upsert({ movie_id: 1, member: "A", value: 3 })
  expect(calls[1].headers.Prefer).toBe("resolution=merge-duplicates,return=minimal")
  await db.from("ratings").delete().match({ movie_id: 1, member: "A" })
  expect(calls[2]).toMatchObject({ method: "DELETE", url: "https://x.supabase.co/rest/v1/ratings?movie_id=eq.1&member=eq.A" })
  await db.from("movies").update({ pick: "B" }).eq("pick", "A")
  expect(calls[3]).toMatchObject({ method: "PATCH", body: JSON.stringify({ pick: "B" }) })
})

test("errors and dropped connections come back as an error, never a throw", async () => {
  reply(401, { message: "new row violates row-level security policy", code: "42501" })
  expect((await db.from("movies").insert({})).error).toEqual({ message: "new row violates row-level security policy", code: "42501" })
  vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch") }))
  const r = await db.from("movies").select("*")
  expect(r.data).toBeNull()
  expect(r.error?.message).toBe("Failed to fetch")
})
