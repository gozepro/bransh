-- Bransh — marquage des signalements d'exemple (démonstration)
-- À exécuter dans Supabase > SQL Editor.

-- 1. Colonne qui distingue les signalements d'exemple des vrais
alter table public.reports
  add column if not exists is_demo boolean not null default false;

-- 2. Un utilisateur ne peut pas créer lui-même un signalement d'exemple
drop policy if exists "créer un signalement" on public.reports;
create policy "créer un signalement" on public.reports
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'non_verifiee'
    and importance = 'modere'
    and hidden = false
    and is_demo = false
  );

-- 3. La vue du fil expose la nouvelle colonne (ajoutée en dernier)
create or replace view public.reports_feed with (security_invoker = true) as
select
  r.id, r.title, r.body, r.place_name, r.occurred_at, r.witnessed,
  r.importance, r.status, r.hidden, r.created_at, r.updated_at,
  st_y(r.location::geometry) as lat,
  st_x(r.location::geometry) as lng,
  c.slug  as category_slug,
  c.label as category_label,
  p.display_name as author_name,
  p.trust_score  as author_trust,
  (select count(*) from public.report_votes v
     where v.report_id = r.id and v.kind = 'confirm') as confirmations,
  (select count(*) from public.report_votes v
     where v.report_id = r.id and v.kind = 'contest') as contestations,
  r.is_demo
from public.reports r
join public.categories c on c.id = r.category_id
join public.profiles   p on p.id = r.author_id;
