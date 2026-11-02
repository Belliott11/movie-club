import { useEffect, useState } from "react"
import type { Card } from "./deck"
import { key } from "./stats"

/** A "top films" list as written by scripts/build-lists.mjs: its films in rank order. */
export type TopList = { id: string; name: string; short: string; films: [string, number][] }

let loading: Promise<TopList[]> | null = null
/** The lists file, read once. Empty when it isn't there. */
export function loadLists(): Promise<TopList[]> {
  return (loading ??= fetch(`${import.meta.env.BASE_URL}lists.json`, { cache: "no-cache" }).then(r => (r.ok ? r.json() : { lists: [] })).then((j: { lists: TopList[] }) => j.lists).catch(() => []))
}

export function useLists(): TopList[] {
  const [lists, setLists] = useState<TopList[]>([])
  useEffect(() => { loadLists().then(setLists) }, [])
  return lists
}

/** A card for a list: a film fits if it is on it (a year either side counts, since release years differ by region). */
export function listCard(list: TopList): Card {
  const by = new Map<string, number[]>()
  for (const [t, y] of list.films) by.set(key(t, 0).split("|")[0], [...(by.get(key(t, 0).split("|")[0]) ?? []), y])
  return {
    id: `list-${list.id}`,
    title: `On ${list.short}`,
    rule: `One of the films on ${list.name}.`,
    fits: f => by.get(key(f.title, 0).split("|")[0])?.some(y => Math.abs(y - f.year) <= 1) ?? false,
    list: list.films,
  }
}
