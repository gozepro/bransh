-- Bransh — nouveau sujet « bénévolat / partenariat » pour les demandes d'aide
-- À exécuter dans Supabase > SQL Editor.

alter table public.help_requests drop constraint if exists help_requests_topic_check;
alter table public.help_requests
  add constraint help_requests_topic_check
  check (topic in ('compte', 'signalement', 'bug', 'suggestion', 'benevole', 'autre'));
