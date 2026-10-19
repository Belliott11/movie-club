-- Run once in Supabase SQL editor. Open anon access = friend-group trust model.
create table movies (
  id bigint generated always as identity primary key,
  seq int not null, title text not null, year int, pick text,
  tmdb_id int, imdb numeric, rt numeric, mc numeric, lb numeric
);
create table ratings (
  movie_id bigint references movies(id) on delete cascade,
  member text, value numeric not null, primary key (movie_id, member)
);
create table watchlist (
  member text, title text, year int, primary key (member, title, year)
);
create table suggestions (
  id bigint generated always as identity primary key,
  title text not null, year int, by text, votes text[] default '{}'
);
do $$ declare t text; begin
  foreach t in array array['movies','ratings','watchlist','suggestions'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "open" on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- People who haven't rated anything yet (so they can be added to a meetup right away).
create table if not exists members (name text primary key);
alter table members enable row level security;
create policy "open" on members for all using (true) with check (true);

-- One-line takes on a film, one per person per film.
create table if not exists takes (
  movie_id bigint references movies(id) on delete cascade,
  member text, text text not null, primary key (movie_id, member)
);
alter table takes enable row level security;
create policy "open" on takes for all using (true) with check (true);
