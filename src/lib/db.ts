/**
 * The small slice of Supabase's REST interface the app uses, so the 100 kB client library isn't downloaded.
 * Same call shapes: `db.from("movies").select("*")`, `.insert(rows).select().single()`, `.upsert(row)`,
 * `.update(fields).eq(col, v)`, `.delete().match({...})`. Every call resolves to `{ data, error }` and never throws;
 * a dropped connection is an `error` too, like the library did.
 */
export type DbError = { message: string; code?: string }
export type DbResult = { data: any; error: DbError | null }

type Config = { url: string; key: string; code: () => string }

class Query implements PromiseLike<DbResult> {
  private method = "GET"
  private filters: string[] = []
  private cols = "*"
  private body: unknown = undefined
  private prefer: string[] = []
  private wantsRows = true // a plain read, or a write followed by .select()
  private one = false

  private cfg: Config
  private table: string
  constructor(cfg: Config, table: string) { this.cfg = cfg; this.table = table }

  select(cols = "*") {
    this.cols = cols
    if (this.method !== "GET") this.prefer.push("return=representation")
    return this
  }
  insert(rows: unknown) { this.method = "POST"; this.body = rows; this.prefer.push("return=minimal"); this.wantsRows = false; return this }
  upsert(rows: unknown) { this.method = "POST"; this.body = rows; this.prefer.push("resolution=merge-duplicates", "return=minimal"); this.wantsRows = false; return this }
  update(fields: unknown) { this.method = "PATCH"; this.body = fields; this.prefer.push("return=minimal"); this.wantsRows = false; return this }
  delete() { this.method = "DELETE"; this.prefer.push("return=minimal"); this.wantsRows = false; return this }
  eq(col: string, val: string | number) { this.filters.push(`${encodeURIComponent(col)}=eq.${encodeURIComponent(String(val))}`); return this }
  match(where: Record<string, string | number>) { for (const [c, v] of Object.entries(where)) this.eq(c, v); return this }
  single() { this.one = true; return this }

  private async run(): Promise<DbResult> {
    const { url, key, code } = this.cfg
    const params = [...(this.method === "GET" || this.prefer.includes("return=representation") ? [`select=${encodeURIComponent(this.cols)}`] : []), ...this.filters]
    // a later .select() on a write asks for the rows back instead of nothing
    const prefer = this.prefer.includes("return=representation") ? this.prefer.filter(p => p !== "return=minimal") : this.prefer
    const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}` }
    if (this.body !== undefined) headers["Content-Type"] = "application/json"
    if (prefer.length) headers.Prefer = prefer.join(",")
    if (this.one) headers.Accept = "application/vnd.pgrst.object+json"
    if (code()) headers["x-club-code"] = code()
    try {
      const res = await fetch(`${url}/rest/v1/${this.table}${params.length ? `?${params.join("&")}` : ""}`, { method: this.method, headers, body: this.body === undefined ? undefined : JSON.stringify(this.body) })
      const text = await res.text()
      const json = text ? JSON.parse(text) : null
      if (!res.ok) return { data: null, error: { message: json?.message ?? `Request failed (${res.status})`, code: json?.code } }
      return { data: this.wantsRows || prefer.includes("return=representation") ? json : null, error: null }
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : String(e) } }
    }
  }

  then<A = DbResult, B = never>(onOk?: ((v: DbResult) => A | PromiseLike<A>) | null, onErr?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return this.run().then(onOk, onErr)
  }
}

export const createDb = (cfg: Config) => ({ from: (table: string) => new Query(cfg, table) })
