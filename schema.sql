-- Movie Club database. Safe to run as many times as you like: it only adds what is missing.
-- Run the whole file in the Supabase SQL Editor. Open anon access = friend-group trust model
-- (for an edit lock, see schema-lock.sql afterwards).

create table if not exists movies (
  id bigint generated always as identity primary key,
  seq int not null, title text not null, year int, pick text,
  tmdb_id int, imdb numeric, rt numeric, mc numeric, lb numeric
);
create table if not exists ratings (
  movie_id bigint references movies(id) on delete cascade,
  member text, value numeric not null, primary key (movie_id, member)
);
create table if not exists watchlist (
  member text, title text, year int, primary key (member, title, year)
);
create table if not exists suggestions (
  id bigint generated always as identity primary key,
  title text not null, year int, by text, votes text[] default '{}'
);

-- People who haven't rated anything yet (so they can be added to a meetup right away).
create table if not exists members (name text primary key);

-- One-line takes on a film, one per person per film.
create table if not exists takes (
  movie_id bigint references movies(id) on delete cascade,
  member text, text text not null, primary key (movie_id, member)
);

-- "Seen" and "not interested" marks on recommendations, one per person per film.
create table if not exists rec_flags (
  member text, tmdb_id int, kind text not null check (kind in ('seen', 'skip')),
  primary key (member, tmdb_id)
);

-- Everything someone has watched and rated on Letterboxd (from their data export). One row per person.
create table if not exists lb_history (
  member text primary key, data jsonb not null, updated_at timestamptz default now()
);

-- Open access for every table (replaces any earlier policy, so re-running is fine).
do $$ declare t text; begin
  foreach t in array array['movies','ratings','watchlist','suggestions','members','takes','rec_flags','lb_history'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "open" on %I', t);
    execute format('create policy "open" on %I for all using (true) with check (true)', t);
  end loop;
end $$;
