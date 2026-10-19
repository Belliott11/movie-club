-- OPTIONAL edit lock. Everyone can still read; changes need the club code.
-- 1. Replace change-me with your code below, then run this in the Supabase SQL Editor.
-- 2. Each person enters the code once at the bottom of the site (it is saved on their device).
-- To undo: re-run the "open" policy lines at the bottom of this file.

do $$ declare t text; begin
  foreach t in array array['movies','ratings','watchlist','suggestions','members','takes'] loop
    execute format('drop policy if exists "open" on %I', t);
    execute format('drop policy if exists "read" on %I', t);
    execute format('drop policy if exists "write" on %I', t);
    execute format('create policy "read" on %I for select using (true)', t);
    execute format($p$create policy "write" on %I for all
      using ((current_setting('request.headers', true)::json ->> 'x-club-code') = 'change-me')
      with check ((current_setting('request.headers', true)::json ->> 'x-club-code') = 'change-me')$p$, t);
  end loop;
end $$;

-- Undo (back to open editing):
-- do $$ declare t text; begin
--   foreach t in array array['movies','ratings','watchlist','suggestions','members','takes'] loop
--     execute format('drop policy if exists "read" on %I', t);
--     execute format('drop policy if exists "write" on %I', t);
--     execute format('create policy "open" on %I for all using (true) with check (true)', t);
--   end loop;
-- end $$;
