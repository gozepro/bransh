-- Bransh — paramètres : préférences de notification, avis, suppression de compte
-- À exécuter dans Supabase > SQL Editor.

-- 1. Préférences de notification (enregistrées dès maintenant, utilisées au lancement des notifications)
alter table public.profiles
  add column if not exists notif_critical   boolean not null default true,
  add column if not exists notif_my_reports boolean not null default true,
  add column if not exists notif_nearby     boolean not null default false,
  add column if not exists notif_news       boolean not null default false;

grant update (notif_critical, notif_my_reports, notif_nearby, notif_news) on public.profiles to authenticated;

-- 2. Note et avis
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  message    text check (char_length(message) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "envoyer un avis" on public.feedback;
create policy "envoyer un avis" on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "lire ses avis ou tous si modérateur" on public.feedback;
create policy "lire ses avis ou tous si modérateur" on public.feedback
  for select to authenticated
  using (user_id = auth.uid() or public.is_moderator());

grant select, insert on public.feedback to authenticated;

-- 3. Une personne peut lister et supprimer ses propres images (nécessaire à la suppression de compte)
drop policy if exists "bransh lister ses images" on storage.objects;
create policy "bransh lister ses images" on storage.objects
  for select to authenticated
  using (bucket_id = 'report-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "bransh supprimer ses images" on storage.objects;
create policy "bransh supprimer ses images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'report-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Suppression de son propre compte et de toutes ses données
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Connexion requise';
  end if;

  if exists (select 1 from public.profiles where id = v_uid and role in ('admin', 'moderator')) then
    raise exception 'Les comptes administrateurs et modérateurs ne peuvent pas être supprimés ici';
  end if;

  delete from public.reports      where author_id = v_uid;   -- supprime aussi leurs médias, votes et historique
  delete from public.report_votes where user_id = v_uid;
  delete from public.report_media where uploader_id = v_uid;
  update public.status_history set changed_by = null where changed_by = v_uid;

  delete from auth.users where id = v_uid;                   -- supprime aussi le profil et les avis
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
