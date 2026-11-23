-- Bransh — cadrage des photos + vérifications sans doublon
-- (à exécuter dans Supabase > SQL Editor)

-- 1. Point du cadrage à mettre en valeur pour chaque image (en %, 50/50 = centre)
alter table public.report_media
  add column if not exists focus_x smallint not null default 50 check (focus_x between 0 and 100),
  add column if not exists focus_y smallint not null default 50 check (focus_y between 0 and 100);

-- 2. Une vérification doit changer quelque chose :
--    le serveur refuse d'enregistrer le même statut et la même importance une deuxième fois
create or replace function public.review_report(
  p_report     uuid,
  p_status     report_status,
  p_importance importance_level,
  p_reason     text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old     report_status;
  v_old_imp importance_level;
begin
  if not public.is_staff() then
    raise exception 'Réservé aux vérificateurs';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Une justification est obligatoire';
  end if;

  select status, importance into v_old, v_old_imp
  from public.reports where id = p_report for update;
  if not found then
    raise exception 'Signalement introuvable';
  end if;

  if v_old = p_status and v_old_imp = p_importance then
    raise exception 'Aucun changement : ce signalement a déjà ce statut et cette importance';
  end if;

  update public.reports
     set status = p_status, importance = p_importance, updated_at = now()
   where id = p_report;

  insert into public.status_history (report_id, old_status, new_status, reason, changed_by)
  values (p_report, v_old, p_status, p_reason, auth.uid());
end;
$$;
