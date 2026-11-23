-- Bransh — droits d'accès aux tables
-- Les règles de sécurité (RLS) filtrent ensuite les lignes visibles ou modifiables.

grant usage on schema public to anon, authenticated;

-- Lecture publique
grant select on
  public.categories, public.profiles, public.reports,
  public.report_media, public.report_votes, public.status_history,
  public.reports_feed
to anon, authenticated;

-- Actions réservées aux utilisateurs connectés
grant insert on public.reports, public.report_media, public.report_votes to authenticated;
grant update (display_name, commune) on public.profiles to authenticated;
grant update (kind, comment) on public.report_votes to authenticated;

-- Fonctions
grant execute on function public.is_staff(), public.is_moderator() to anon, authenticated;
grant execute on function public.reports_nearby(double precision, double precision, int) to anon, authenticated;
grant execute on function public.review_report(uuid, report_status, importance_level, text) to authenticated;
grant execute on function public.set_report_hidden(uuid, boolean) to authenticated;
