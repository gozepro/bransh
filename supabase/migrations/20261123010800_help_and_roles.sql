-- Bransh — aide / service client et gestion des rôles par les administrateurs
-- À exécuter dans Supabase > SQL Editor.

-- 1. Le déclencheur qui protège le rôle et le score de confiance laisse passer les fonctions de confiance
--    (elles s'exécutent avec les droits du propriétaire de la base, pas ceux de l'utilisateur).
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null
     and current_user in ('authenticated', 'anon')
     and (new.role is distinct from old.role
          or new.trust_score is distinct from old.trust_score) then
    raise exception 'Modification interdite';
  end if;
  return new;
end;
$$;

-- 2. Journal des changements de rôle
create table if not exists public.role_changes (
  id         bigint generated always as identity primary key,
  target_id  uuid references public.profiles(id) on delete set null,
  old_role   user_role not null,
  new_role   user_role not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

alter table public.role_changes enable row level security;

drop policy if exists "journal des rôles pour les admins" on public.role_changes;
create policy "journal des rôles pour les admins" on public.role_changes
  for select to authenticated
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin'));

grant select on public.role_changes to authenticated;

-- 3. Recherche d'utilisateurs (adresse e-mail masquée) réservée aux administrateurs
create or replace function public.admin_search_users(p_query text default '')
returns table (id uuid, display_name text, email_hint text, role user_role, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin') then
    raise exception 'Réservé aux administrateurs';
  end if;

  return query
  select p.id,
         p.display_name,
         (left(u.email, 1) || '***' || substring(u.email from position('@' in u.email)))::text,
         p.role,
         p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where coalesce(p_query, '') = ''
     or p.display_name ilike '%' || p_query || '%'
     or u.email ilike '%' || p_query || '%'
  order by p.created_at desc
  limit 20;
end;
$$;

-- 4. Changer le rôle de quelqu'un (administrateurs uniquement, jamais le sien)
create or replace function public.set_user_role(p_user uuid, p_role user_role)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old user_role;
begin
  if not exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin') then
    raise exception 'Réservé aux administrateurs';
  end if;
  if p_user = auth.uid() then
    raise exception 'Tu ne peux pas modifier ton propre rôle';
  end if;

  select role into v_old from public.profiles where id = p_user for update;
  if not found then
    raise exception 'Utilisateur introuvable';
  end if;
  if v_old = p_role then
    raise exception 'Cette personne a déjà ce rôle';
  end if;

  update public.profiles set role = p_role where id = p_user;

  insert into public.role_changes (target_id, old_role, new_role, changed_by)
  values (p_user, v_old, p_role, auth.uid());
end;
$$;

-- 5. Demandes d'aide (service client)
create table if not exists public.help_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  topic      text not null check (topic in ('compte', 'signalement', 'bug', 'suggestion', 'autre')),
  message    text not null check (char_length(message) between 10 and 2000),
  status     text not null default 'ouvert' check (status in ('ouvert', 'traite')),
  created_at timestamptz not null default now()
);

alter table public.help_requests enable row level security;

-- 5 demandes par jour et par personne au maximum (anti-spam)
drop policy if exists "envoyer une demande d'aide" on public.help_requests;
create policy "envoyer une demande d'aide" on public.help_requests
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (select count(*) from public.help_requests h
         where h.user_id = auth.uid() and h.created_at > now() - interval '1 day') < 5
  );

drop policy if exists "voir ses demandes d'aide" on public.help_requests;
create policy "voir ses demandes d'aide" on public.help_requests
  for select to authenticated
  using (user_id = auth.uid());

grant select, insert on public.help_requests to authenticated;

-- 6. Boîte de réception des administrateurs (avec l'adresse e-mail pour répondre)
create or replace function public.admin_help_requests()
returns table (id uuid, topic text, message text, status text, created_at timestamptz, author_name text, author_email text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin') then
    raise exception 'Réservé aux administrateurs';
  end if;

  return query
  select h.id, h.topic, h.message, h.status, h.created_at, p.display_name, u.email::text
  from public.help_requests h
  join public.profiles p on p.id = h.user_id
  join auth.users u on u.id = h.user_id
  order by (h.status = 'ouvert') desc, h.created_at desc
  limit 50;
end;
$$;

create or replace function public.admin_set_help_status(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin') then
    raise exception 'Réservé aux administrateurs';
  end if;
  if p_status not in ('ouvert', 'traite') then
    raise exception 'Statut invalide';
  end if;
  update public.help_requests set status = p_status where id = p_id;
end;
$$;

-- 7. Droits d'exécution : réservés aux personnes connectées (les fonctions vérifient ensuite le rôle)
revoke execute on function public.admin_search_users(text) from public, anon;
revoke execute on function public.set_user_role(uuid, user_role) from public, anon;
revoke execute on function public.admin_help_requests() from public, anon;
revoke execute on function public.admin_set_help_status(uuid, text) from public, anon;

grant execute on function public.admin_search_users(text) to authenticated;
grant execute on function public.set_user_role(uuid, user_role) to authenticated;
grant execute on function public.admin_help_requests() to authenticated;
grant execute on function public.admin_set_help_status(uuid, text) to authenticated;
