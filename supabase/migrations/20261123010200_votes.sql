-- Bransh — vote Confirmer / Contester (à exécuter dans Supabase > SQL Editor)
--
-- Pourquoi une fonction : elle vérifie les règles côté serveur
-- (connexion obligatoire, pas de vote sur son propre signalement,
-- un seul vote par personne que l'on peut changer).

create or replace function public.vote_report(
  p_report  uuid,
  p_kind    vote_kind,
  p_comment text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  if not exists (select 1 from public.reports where id = p_report and not hidden) then
    raise exception 'Signalement introuvable';
  end if;

  if exists (select 1 from public.reports where id = p_report and author_id = auth.uid()) then
    raise exception 'Tu ne peux pas voter sur ton propre signalement';
  end if;

  insert into public.report_votes (report_id, user_id, kind, comment)
  values (p_report, auth.uid(), p_kind, p_comment)
  on conflict (report_id, user_id)
  do update set kind = excluded.kind,
                comment = excluded.comment,
                created_at = now();
end;
$$;

grant execute on function public.vote_report(uuid, vote_kind, text) to authenticated;
