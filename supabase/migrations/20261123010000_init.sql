-- ============================================================
-- BRANSH — Schéma MVP pour Supabase (Postgres + PostGIS)
-- ============================================================

create extension if not exists postgis with schema extensions;

-- ---------- Types ----------
create type user_role as enum ('citizen', 'verifier', 'moderator', 'admin');

create type report_status as enum (
  'non_verifiee', 'en_verification', 'corroboree',
  'confirmee', 'contestee', 'dementie', 'expiree'
);

create type importance_level as enum ('faible', 'modere', 'eleve', 'critique');

create type vote_kind as enum ('confirm', 'contest');

-- ---------- Tables ----------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Citoyen',
  commune      text,
  role         user_role not null default 'citizen',
  trust_score  int not null default 50 check (trust_score between 0 and 100),
  created_at   timestamptz not null default now()
);

create table public.categories (
  id    smallint generated always as identity primary key,
  slug  text unique not null,
  label text not null
);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id),
  category_id smallint not null references public.categories(id),
  title       text not null check (char_length(title) between 5 and 80),
  body        text not null check (char_length(body) between 20 and 2000),
  place_name  text not null,
  location    geography(Point, 4326) not null,
  occurred_at timestamptz not null default now(),
  witnessed   boolean not null default true,          -- "J'étais sur place" / "Je l'ai vu ailleurs"
  importance  importance_level not null default 'modere',
  status      report_status not null default 'non_verifiee',
  hidden      boolean not null default false,         -- masqué par la modération
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index reports_location_idx on public.reports using gist (location);
create index reports_created_idx  on public.reports (created_at desc);
create index reports_status_idx   on public.reports (status);

create table public.report_media (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.reports(id) on delete cascade,
  uploader_id  uuid not null references public.profiles(id),
  storage_path text not null,
  kind         text not null default 'photo' check (kind in ('photo', 'evidence')),
  created_at   timestamptz not null default now()
);

create table public.report_votes (
  report_id  uuid not null references public.reports(id) on delete cascade,
  user_id    uuid not null references public.profiles(id),
  kind       vote_kind not null,
  comment    text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table public.status_history (
  id         bigint generated always as identity primary key,
  report_id  uuid not null references public.reports(id) on delete cascade,
  old_status report_status,
  new_status report_status not null,
  reason     text not null,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now()
);

-- ---------- Fonctions utilitaires ----------
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('verifier', 'moderator', 'admin')
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Citoyen'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un utilisateur ne peut pas se donner un rôle ou un score de confiance
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null
     and (new.role is distinct from old.role
          or new.trust_score is distinct from old.trust_score) then
    raise exception 'Modification interdite';
  end if;
  return new;
end;
$$;

create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Changement de statut / importance par un vérificateur (justification obligatoire + historique)
create or replace function public.review_report(
  p_report     uuid,
  p_status     report_status,
  p_importance importance_level,
  p_reason     text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old report_status;
begin
  if not public.is_staff() then
    raise exception 'Réservé aux vérificateurs';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Une justification est obligatoire';
  end if;

  select status into v_old from public.reports where id = p_report for update;
  if not found then
    raise exception 'Signalement introuvable';
  end if;

  update public.reports
     set status = p_status, importance = p_importance, updated_at = now()
   where id = p_report;

  insert into public.status_history (report_id, old_status, new_status, reason, changed_by)
  values (p_report, v_old, p_status, p_reason, auth.uid());
end;
$$;

-- Masquer / réafficher un contenu abusif (modérateurs)
create or replace function public.set_report_hidden(p_report uuid, p_hidden boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then
    raise exception 'Réservé aux modérateurs';
  end if;
  update public.reports set hidden = p_hidden, updated_at = now() where id = p_report;
end;
$$;

-- ---------- Vue pour le fil d'actualité ----------
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
     where v.report_id = r.id and v.kind = 'contest') as contestations
from public.reports r
join public.categories c on c.id = r.category_id
join public.profiles   p on p.id = r.author_id;

-- Signalements proches d'une position (rayon en mètres)
create or replace function public.reports_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 5000
) returns setof public.reports_feed
language sql stable set search_path = public, extensions as $$
  select f.*
  from public.reports_feed f
  join public.reports r on r.id = f.id
  where st_dwithin(
          r.location,
          st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
          p_radius_m)
  order by st_distance(
          r.location,
          st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography);
$$;

-- ---------- Sécurité (Row Level Security) ----------
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.reports        enable row level security;
alter table public.report_media   enable row level security;
alter table public.report_votes   enable row level security;
alter table public.status_history enable row level security;

create policy "profils lisibles" on public.profiles
  for select using (true);
create policy "modifier son propre profil" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "catégories lisibles" on public.categories
  for select using (true);

create policy "signalements visibles" on public.reports
  for select using (not hidden or public.is_staff());
create policy "créer un signalement" on public.reports
  for insert to authenticated
  with check (author_id = auth.uid()
              and status = 'non_verifiee'
              and importance = 'modere'
              and hidden = false);

create policy "médias visibles" on public.report_media
  for select using (
    exists (select 1 from public.reports r
            where r.id = report_id and (not r.hidden or public.is_staff()))
  );
create policy "ajouter un média" on public.report_media
  for insert to authenticated with check (uploader_id = auth.uid());

create policy "votes visibles" on public.report_votes
  for select using (true);
create policy "voter (pas sur son propre signalement)" on public.report_votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.reports r
                    where r.id = report_id and r.author_id = auth.uid())
  );
create policy "changer son vote" on public.report_votes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "historique lisible" on public.status_history
  for select using (true);

-- ---------- Données de départ ----------
insert into public.categories (slug, label) values
  ('transport',     'Transport'),
  ('securite',      'Sécurité'),
  ('sante',         'Santé'),
  ('politique',     'Politique'),
  ('environnement', 'Environnement'),
  ('alertes',       'Alertes et urgences');

-- ============================================================
-- Pour t'attribuer le rôle admin après ta première inscription
-- (à exécuter dans le SQL Editor, avec ton propre user id) :
--   update public.profiles set role = 'admin' where id = '<ton-uuid>';
-- ============================================================
