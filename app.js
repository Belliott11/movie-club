const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sb = CONFIG.SUPABASE_URL ? supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY) : null;
const LS = "movieclub-v1";
let S = { movies: [], watchlist: [], suggestions: [] };
let me = localStorage.getItem("me") || "";
let tab = "movies";
let attending = new Set(JSON.parse(localStorage.getItem("attending") || "[]"));
let recs = null;

// ---------- store ----------
async function load() {
  if (!sb) { S = JSON.parse(localStorage.getItem(LS) || '{"movies":[],"watchlist":[],"suggestions":[]}'); return; }
  const [m, r, w, s] = await Promise.all(["movies", "ratings", "watchlist", "suggestions"].map(t => sb.from(t).select("*")));
  const err = [m, r, w, s].find(x => x.error); if (err) throw err.error;
  S.movies = m.data.sort((a, b) => a.seq - b.seq).map(x => ({ ...x, ratings: {} }));
  const byId = Object.fromEntries(S.movies.map(x => [x.id, x]));
  r.data.forEach(x => byId[x.movie_id] && (byId[x.movie_id].ratings[x.member] = +x.value));
  S.watchlist = w.data; S.suggestions = s.data;
}
const persist = () => { if (!sb) localStorage.setItem(LS, JSON.stringify(S)); };
const must = async p => { const { error } = await p; if (error) alert(error.message); };

async function addMovie(title, year, pick, ratings = {}) {
  const seq = Math.max(0, ...S.movies.map(m => m.seq)) + 1;
  const m = { seq, title, year, pick, ratings };
  if (sb) {
    const { data, error } = await sb.from("movies").insert({ seq, title, year, pick }).select().single();
    if (error) return alert(error.message);
    m.id = data.id;
    const rows = Object.entries(ratings).map(([member, value]) => ({ movie_id: m.id, member, value }));
    if (rows.length) await must(sb.from("ratings").insert(rows));
  } else m.id = Date.now() + Math.random();
  S.movies.push(m); persist();
}
async function setRating(m, member, v) {
  if (v === "") { delete m.ratings[member]; if (sb) await must(sb.from("ratings").delete().match({ movie_id: m.id, member })); }
  else { m.ratings[member] = +v; if (sb) await must(sb.from("ratings").upsert({ movie_id: m.id, member, value: +v })); }
  persist();
}
async function setOutside(m, f) {
  Object.assign(m, f); persist();
  if (sb) await must(sb.from("movies").update(f).eq("id", m.id));
}

// ---------- stats ----------
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const fmt = (n, d = 2) => n == null ? "–" : (+n.toFixed(d)).toString();
const groupAvg = m => avg(Object.values(m.ratings));
const outsideAvg = m => avg([m.imdb != null && m.imdb / 2, m.rt != null && m.rt / 20, m.mc != null && m.mc / 20, m.lb].filter(x => x !== false && x != null && !isNaN(x)));
const sd = m => { const v = Object.values(m.ratings), a = avg(v); return v.length > 1 ? Math.sqrt(avg(v.map(x => (x - a) ** 2))) : 0; };
const members = () => [...new Set([...S.movies.flatMap(m => [m.pick, ...Object.keys(m.ratings)]), ...S.watchlist.map(w => w.member), me].filter(Boolean))].sort();
const key = (t, y) => (t + "|" + y).toLowerCase().replace(/[^a-z0-9|]/g, "");
const watchedKeys = () => new Set(S.movies.map(m => key(m.title, m.year)));

function nextPicker() {
  const last = n => Math.max(-1, ...S.movies.filter(m => m.pick === n).map(m => m.seq));
  return [...attending].sort((a, b) => last(a) - last(b) || a.localeCompare(b)).map(n => ({ n, last: last(n) }));
}

// ---------- tmdb (optional) ----------
const tmdb = async (p, q = "") => CONFIG.TMDB_KEY ? (await fetch(`https://api.themoviedb.org/3${p}?api_key=${CONFIG.TMDB_KEY}${q}`)).json() : null;
async function loadRecs() {
  recs = [];
  const seen = watchedKeys();
  for (const m of [...S.movies].sort((a, b) => groupAvg(b) - groupAvg(a)).slice(0, 4)) {
    const s = await tmdb("/search/movie", `&query=${encodeURIComponent(m.title)}&year=${m.year}`);
    const id = s?.results?.[0]?.id; if (!id) continue;
    const r = await tmdb(`/movie/${id}/recommendations`);
    for (const x of r?.results?.slice(0, 6) || []) {
      const y = +(x.release_date || "").slice(0, 4);
      if (!seen.has(key(x.title, y)) && !recs.some(q => q.title === x.title)) recs.push({ title: x.title, year: y, because: m.title });
    }
  }
  render();
}

// ---------- csv ----------
function parseCsv(t) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f.replace(/\r$/, "")); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
async function importWatchlist(file) {
  if (!me) return alert("Pick your name first.");
  const rows = parseCsv(await file.text()), h = rows[0].map(x => x.trim());
  const ni = h.indexOf("Name"), yi = h.indexOf("Year");
  if (ni < 0) return alert("Expected a Letterboxd watchlist.csv (Name, Year columns).");
  const items = rows.slice(1).filter(r => r[ni]).map(r => ({ member: me, title: r[ni], year: +r[yi] || 0 }));
  S.watchlist = S.watchlist.filter(w => w.member !== me).concat(items); persist();
  if (sb) { await must(sb.from("watchlist").delete().eq("member", me)); for (let i = 0; i < items.length; i += 500) await must(sb.from("watchlist").insert(items.slice(i, i + 500))); }
  render();
}

// ---------- views ----------
function movieCard(m) {
  const g = groupAvg(m), o = outsideAvg(m), d = g != null && o != null ? g - o : null;
  const mem = [...new Set([...members(), ...Object.keys(m.ratings)])];
  return `<details class="card"><summary>
    <span class="t">${esc(m.title)} <small>${m.year || ""}</small></span>
    <span class="meta">${esc(m.pick)}'s pick</span>
    <span class="avg" title="Group average">${fmt(g)}</span>
    <span class="avg o" title="Outside average (out of 5)">${fmt(o)}</span>
    <span class="diff ${d > 0 ? "up" : "down"}">${d == null ? "" : (d > 0 ? "+" : "") + fmt(d)}</span>
  </summary><div class="body">
    <div class="rates">${mem.map(n => `<label>${esc(n)}<select data-m="${m.id}" data-r="${esc(n)}"><option value="">–</option>${[...Array(10)].map((_, i) => (i + 1) / 2).map(v => `<option ${m.ratings[n] === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`).join("")}</div>
    <div class="out"><b>Outside:</b>
      ${[["imdb", "IMDb /10"], ["rt", "RT /100"], ["mc", "Metacritic /100"], ["lb", "Letterboxd /5"]].map(([k, l]) => `<label>${l}<input type="number" step="any" data-m="${m.id}" data-o="${k}" value="${m[k] ?? ""}"></label>`).join("")}
    </div></div></details>`;
}
const vMovies = () => `
  <p class="hint">Columns: group avg · outside avg (IMDb/RT/Metacritic/Letterboxd normalized to 5) · difference. Tap a film to rate.</p>
  ${[...S.movies].reverse().map(movieCard).join("") || "<p>No movies yet.</p>"}
  <details class="card"><summary><b>+ Add movie</b></summary><form id="add" class="body">
    <input name="title" placeholder="Title" required> <input name="year" type="number" placeholder="Year" required>
    <input name="pick" placeholder="Picked by" value="${esc(nextPicker()[0]?.n || me)}" required> <button>Add</button></form></details>
  ${S.movies.length ? "" : '<button id="seed">Import club history (21 films)</button>'}`;

const vNext = () => {
  const order = nextPicker();
  const wl = [...watchedKeys()];
  const counts = {};
  S.watchlist.filter(w => attending.has(w.member) && !wl.includes(key(w.title, w.year))).forEach(w => {
    const k = key(w.title, w.year); (counts[k] ||= { t: w.title, y: w.year, who: [] }).who.push(w.member);
  });
  const hits = Object.values(counts).sort((a, b) => b.who.length - a.who.length).slice(0, 12);
  return `<h3>Who's here this week?</h3>
  <div class="chips">${members().map(n => `<label class="chip"><input type="checkbox" data-att="${esc(n)}" ${attending.has(n) ? "checked" : ""}>${esc(n)}</label>`).join("")}</div>
  ${order.length ? `<h3>Pick order</h3><ol>${order.map((x, i) => `<li>${i == 0 ? "<b>" : ""}${esc(x.n)}${i == 0 ? " — up next</b>" : ""} <small>last picked: ${x.last < 0 ? "never" : esc(S.movies.find(m => m.seq === x.last).title)}</small></li>`).join("")}</ol>` : "<p class='hint'>Tick attendees to see who picks.</p>"}
  <h3>On attendees' watchlists</h3>
  ${hits.length ? `<ul>${hits.map(h => `<li>${esc(h.t)} <small>${h.y || ""}</small> — ${h.who.length}/${attending.size}: ${h.who.map(esc).join(", ")}</li>`).join("")}</ul>` : "<p class='hint'>Upload watchlists on the Watchlists tab and tick attendees.</p>"}`;
};

const vSuggest = () => {
  const sg = [...S.suggestions].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));
  return `<form id="sug"><input name="title" placeholder="Suggest a movie" required> <input name="year" type="number" placeholder="Year"> <button>Suggest</button></form>
  <ul>${sg.map(s => `<li><button data-vote="${s.id}" class="${s.votes?.includes(me) ? "on" : ""}">▲ ${s.votes?.length || 0}</button> ${esc(s.title)} <small>${s.year || ""} · by ${esc(s.by)}</small> <button data-del="${s.id}" class="x">✕</button></li>`).join("") || "<li class='hint'>Nothing suggested yet.</li>"}</ul>
  <h3>Based on your highest-rated films</h3>
  ${!CONFIG.TMDB_KEY ? "<p class='hint'>Add a free TMDB key in config.js to get automatic recommendations.</p>"
    : recs ? `<ul>${recs.slice(0, 20).map(r => `<li>${esc(r.title)} <small>${r.year} · because you liked ${esc(r.because)}</small> <button data-sugrec="${esc(r.title)}|${r.year}">suggest</button></li>`).join("")}</ul>` : "<p>Loading…</p>"}`;
};

const vWatch = () => {
  const by = {}; S.watchlist.forEach(w => by[w.member] = (by[w.member] || 0) + 1);
  const watched = watchedKeys(), all = {};
  S.watchlist.filter(w => !watched.has(key(w.title, w.year))).forEach(w => (all[key(w.title, w.year)] ||= { t: w.title, y: w.year, n: 0 }).n++);
  const shared = Object.values(all).filter(x => x.n > 1).sort((a, b) => b.n - a.n);
  return `<p>Export from Letterboxd: Settings → Import &amp; Export → Export your data, then upload <code>watchlist.csv</code>. Uploading replaces your previous watchlist.</p>
  <label class="btn">Upload watchlist.csv as ${esc(me || "…")} <input type="file" id="wl" accept=".csv" hidden></label>
  <ul>${Object.entries(by).map(([n, c]) => `<li>${esc(n)}: ${c} films</li>`).join("")}</ul>
  <h3>On more than one watchlist (not yet watched)</h3>
  <ul>${shared.slice(0, 30).map(x => `<li>${esc(x.t)} <small>${x.y || ""}</small> — ${x.n} people</li>`).join("") || "<li class='hint'>None yet.</li>"}</ul>`;
};

const vStats = () => {
  const ms = S.movies.filter(m => Object.keys(m.ratings).length);
  const per = members().map(n => {
    const mine = ms.map(m => m.ratings[n]).filter(x => x != null);
    const picks = S.movies.filter(m => m.pick === n);
    return { n, avg: avg(mine), c: mine.length, pa: avg(picks.map(groupAvg).filter(x => x != null)) };
  }).filter(x => x.c || x.pa != null).sort((a, b) => b.pa - a.pa);
  const div = [...ms].sort((a, b) => sd(b) - sd(a)).slice(0, 5);
  const gap = ms.filter(m => outsideAvg(m) != null).sort((a, b) => Math.abs(groupAvg(b) - outsideAvg(b)) - Math.abs(groupAvg(a) - outsideAvg(a))).slice(0, 5);
  const top = [...ms].sort((a, b) => groupAvg(b) - groupAvg(a));
  return `<h3>Top films</h3><ol>${top.slice(0, 5).map(m => `<li>${esc(m.title)} — ${fmt(groupAvg(m))}</li>`).join("")}</ol>
  <h3>People</h3><table><tr><th>Name</th><th>Avg rating given</th><th>Films rated</th><th>Their picks' avg</th></tr>
  ${per.map(p => `<tr><td>${esc(p.n)}</td><td>${fmt(p.avg)}</td><td>${p.c}</td><td>${fmt(p.pa)}</td></tr>`).join("")}</table>
  <h3>Most divisive</h3><ol>${div.map(m => `<li>${esc(m.title)} — spread ${fmt(sd(m))}</li>`).join("")}</ol>
  <h3>Biggest gap vs outside ratings</h3>${gap.length ? `<ol>${gap.map(m => `<li>${esc(m.title)} — us ${fmt(groupAvg(m))} vs ${fmt(outsideAvg(m))}</li>`).join("")}</ol>` : "<p class='hint'>Enter outside ratings on movies to see this.</p>"}`;
};

function render() {
  $("#me").innerHTML = `<option value="">Who are you?</option>` + members().map(n => `<option ${n === me ? "selected" : ""}>${esc(n)}</option>`).join("") + `<option value="__new">+ new person…</option>`;
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  const open = [...document.querySelectorAll("details[open]")].map(d => d.querySelector(".t")?.textContent);
  $("#view").innerHTML = { movies: vMovies, next: vNext, suggest: vSuggest, watch: vWatch, stats: vStats }[tab]();
  document.querySelectorAll("details").forEach(d => open.includes(d.querySelector(".t")?.textContent) && d.querySelector(".t") && (d.open = true));
  if (tab === "suggest" && CONFIG.TMDB_KEY && recs === null) loadRecs();
}

// ---------- events ----------
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.id === "me") {
    if (t.value === "__new") { const n = prompt("Your name?")?.trim(); me = n || me; } else me = t.value;
    localStorage.setItem("me", me); return render();
  }
  if (t.dataset.r !== undefined) return setRating(S.movies.find(m => m.id == t.dataset.m), t.dataset.r, t.value).then(render);
  if (t.dataset.o) return setOutside(S.movies.find(m => m.id == t.dataset.m), { [t.dataset.o]: t.value === "" ? null : +t.value }).then(render);
  if (t.dataset.att) { t.checked ? attending.add(t.dataset.att) : attending.delete(t.dataset.att); localStorage.setItem("attending", JSON.stringify([...attending])); return render(); }
  if (t.id === "wl") importWatchlist(t.files[0]);
});
document.addEventListener("click", async e => {
  const t = e.target;
  if (t.dataset.tab) { tab = t.dataset.tab; return render(); }
  if (t.id === "seed") { for (const [ti, y, p, r] of SEED) await addMovie(ti, y, p, r); return render(); }
  const sg = id => S.suggestions.find(s => s.id == id);
  if (t.dataset.vote) {
    if (!me) return alert("Pick your name first.");
    const s = sg(t.dataset.vote); s.votes = s.votes || [];
    s.votes = s.votes.includes(me) ? s.votes.filter(v => v !== me) : [...s.votes, me]; persist();
    if (sb) await must(sb.from("suggestions").update({ votes: s.votes }).eq("id", s.id));
    render();
  }
  if (t.dataset.del) {
    S.suggestions = S.suggestions.filter(s => s.id != t.dataset.del); persist();
    if (sb) await must(sb.from("suggestions").delete().eq("id", t.dataset.del));
    render();
  }
  if (t.dataset.sugrec) { const [ti, y] = t.dataset.sugrec.split("|"); await addSuggestion(ti, +y); render(); }
});
async function addSuggestion(title, year) {
  if (!me) return alert("Pick your name first.");
  const s = { title, year: year || null, by: me, votes: [me] };
  if (sb) { const { data, error } = await sb.from("suggestions").insert(s).select().single(); if (error) return alert(error.message); s.id = data.id; }
  else s.id = Date.now() + Math.random();
  S.suggestions.push(s); persist();
}
document.addEventListener("submit", async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (e.target.id === "add") await addMovie(f.title.trim(), +f.year, f.pick.trim());
  if (e.target.id === "sug") await addSuggestion(f.title.trim(), +f.year);
  render();
});

load().then(render).catch(err => $("#view").textContent = "Could not load data: " + err.message);
