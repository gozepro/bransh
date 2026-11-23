-- Bransh — signalements d'exemple pour présenter l'application
--
-- AVANT de lancer ce script :
--   1. Crée 3 comptes dans l'application (Connexion > S'inscrire), par exemple avec les noms
--      « Kouamé D. », « Aminata K. » et « Jean-Marc B. » (ils s'afficheront comme auteurs).
--   2. Remplace les 4 adresses e-mail ci-dessous : la tienne (compte administrateur,
--      utilisé comme vérificateur) et celles des 3 comptes d'exemple.
--
-- Le script supprime d'abord les anciens signalements d'exemple (is_demo), donc il peut être relancé.
-- Tous les signalements créés ici sont marqués « Exemple » dans l'application.

do $$
declare
  v_admin uuid;
  v_a     uuid;  -- Kouamé D.
  v_b     uuid;  -- Aminata K.
  v_c     uuid;  -- Jean-Marc B.
  v_id    uuid;
begin
  select id into v_admin from auth.users where email = 'EMAIL-ADMIN@exemple.com';
  select id into v_a     from auth.users where email = 'EMAIL-COMPTE-1@exemple.com';
  select id into v_b     from auth.users where email = 'EMAIL-COMPTE-2@exemple.com';
  select id into v_c     from auth.users where email = 'EMAIL-COMPTE-3@exemple.com';

  if v_admin is null or v_a is null or v_b is null or v_c is null then
    raise exception 'Un compte est introuvable : vérifie les 4 adresses e-mail en haut du script.';
  end if;

  delete from public.reports where is_demo;

  -- 1. Transport · circulation (en vérification)
  insert into public.reports (author_id, category_id, title, body, place_name, location, occurred_at,
                              witnessed, importance, status, is_demo, created_at, updated_at)
  values (v_a, (select id from public.categories where slug = 'transport'),
          'Circulation ralentie sur le pont Félix-Houphouët-Boigny',
          'Des ralentissements sont signalés en direction du Plateau. Prévoyez un peu plus de temps pour vos déplacements.',
          'Pont Félix-Houphouët-Boigny, Plateau',
          st_setsrid(st_makepoint(-4.012, 5.311), 4326)::geography,
          now() - interval '70 minutes', true, 'eleve', 'en_verification', true,
          now() - interval '70 minutes', now() - interval '45 minutes')
  returning id into v_id;
  insert into public.status_history (report_id, old_status, new_status, reason, changed_by, changed_at)
  values (v_id, 'non_verifiee', 'en_verification', 'Deux témoignages concordants, vérification en cours.', v_admin, now() - interval '45 minutes');
  insert into public.report_votes (report_id, user_id, kind, created_at)
  values (v_id, v_b, 'confirm', now() - interval '50 minutes'), (v_id, v_c, 'confirm', now() - interval '48 minutes');

  -- 2. Environnement · initiative locale (confirmée)
  insert into public.reports (author_id, category_id, title, body, place_name, location, occurred_at,
                              witnessed, importance, status, is_demo, created_at, updated_at)
  values (v_c, (select id from public.categories where slug = 'environnement'),
          'Une matinée pour un quartier plus propre',
          'Les habitants du quartier se mobilisent ce samedi pour une opération de nettoyage. Gants, sacs et bonne humeur sont les bienvenus.',
          'Marcory',
          st_setsrid(st_makepoint(-3.98, 5.301), 4326)::geography,
          now() - interval '3 hours', true, 'faible', 'confirmee', true,
          now() - interval '3 hours', now() - interval '2 hours')
  returning id into v_id;
  insert into public.status_history (report_id, old_status, new_status, reason, changed_by, changed_at)
  values (v_id, 'non_verifiee', 'confirmee', 'Information confirmée par plusieurs habitants du quartier.', v_admin, now() - interval '2 hours');
  insert into public.report_votes (report_id, user_id, kind, created_at)
  values (v_id, v_a, 'confirm', now() - interval '170 minutes'),
         (v_id, v_b, 'confirm', now() - interval '160 minutes'),
         (v_id, v_admin, 'confirm', now() - interval '150 minutes');

  -- 3. Transport · embouteillage (non vérifiée)
  insert into public.reports (author_id, category_id, title, body, place_name, location, occurred_at,
                              witnessed, importance, status, is_demo, created_at, updated_at)
  values (v_b, (select id from public.categories where slug = 'transport'),
          'Embouteillage important sur le boulevard Latrille',
          'La circulation est très dense dans les deux sens depuis une vingtaine de minutes. Mieux vaut prévoir un autre itinéraire.',
          'Boulevard Latrille, Cocody',
          st_setsrid(st_makepoint(-3.99, 5.36), 4326)::geography,
          now() - interval '25 minutes', true, 'modere', 'non_verifiee', true,
          now() - interval '25 minutes', now() - interval '25 minutes')
  returning id into v_id;

  -- 4. Sécurité · éclairage public (corroborée)
  insert into public.reports (author_id, category_id, title, body, place_name, location, occurred_at,
                              witnessed, importance, status, is_demo, created_at, updated_at)
  values (v_a, (select id from public.categories where slug = 'securite'),
          'Éclairage public en panne sur plusieurs rues',
          'Plusieurs rues du quartier sont plongées dans le noir depuis hier soir. Soyez prudents en rentrant tard.',
          'Yopougon',
          st_setsrid(st_makepoint(-4.08, 5.34), 4326)::geography,
          now() - interval '5 hours', true, 'modere', 'corroboree', true,
          now() - interval '5 hours', now() - interval '4 hours')
  returning id into v_id;
  insert into public.status_history (report_id, old_status, new_status, reason, changed_by, changed_at)
  values (v_id, 'non_verifiee', 'corroboree', 'Confirmé par deux riverains indépendants.', v_admin, now() - interval '4 hours');
  insert into public.report_votes (report_id, user_id, kind, created_at)
  values (v_id, v_c, 'confirm', now() - interval '280 minutes'), (v_id, v_admin, 'confirm', now() - interval '260 minutes');

  -- 5. Santé · conseil (corroborée)
  insert into public.reports (author_id, category_id, title, body, place_name, location, occurred_at,
                              witnessed, importance, status, is_demo, created_at, updated_at)
  values (v_c, (select id from public.categories where slug = 'sante'),
          'Forte chaleur : pensez à vous hydrater',
          'Il fait très chaud en ce moment. Buvez régulièrement, évitez les efforts en plein soleil et prenez soin des personnes âgées.',
          'Abobo',
          st_setsrid(st_makepoint(-4.017, 5.417), 4326)::geography,
          now() - interval '6 hours', true, 'faible', 'corroboree', true,
          now() - interval '6 hours', now() - interval '5 hours')
  returning id into v_id;
  insert into public.status_history (report_id, old_status, new_status, reason, changed_by, changed_at)
  values (v_id, 'non_verifiee', 'corroboree', 'Conseil de bon sens, cohérent avec les conditions du jour.', v_admin, now() - interval '5 hours');
  insert into public.report_votes (report_id, user_id, kind, created_at)
  values (v_id, v_a, 'confirm', now() - interval '5 hours');

  -- 6. Alertes et urgences · inondation (critique, corroborée)
  insert into public.reports (author_id, category_id, title, body, place_name, location, occurred_at,
                              witnessed, importance, status, is_demo, created_at, updated_at)
  values (v_b, (select id from public.categories where slug = 'alertes'),
          'Route inondée après la forte pluie',
          'De l''eau stagne sur la chaussée et la circulation est difficile. Évitez le secteur si possible.',
          'Adjamé',
          st_setsrid(st_makepoint(-4.027, 5.356), 4326)::geography,
          now() - interval '40 minutes', true, 'critique', 'corroboree', true,
          now() - interval '40 minutes', now() - interval '20 minutes')
  returning id into v_id;
  insert into public.status_history (report_id, old_status, new_status, reason, changed_by, changed_at)
  values (v_id, 'non_verifiee', 'corroboree', 'Trois contributeurs confirment la situation.', v_admin, now() - interval '20 minutes');
  insert into public.report_votes (report_id, user_id, kind, created_at)
  values (v_id, v_a, 'confirm', now() - interval '35 minutes'),
         (v_id, v_c, 'confirm', now() - interval '30 minutes'),
         (v_id, v_admin, 'confirm', now() - interval '25 minutes');

  -- 7. Politique · réunion de quartier (non vérifiée)
  insert into public.reports (author_id, category_id, title, body, place_name, location, occurred_at,
                              witnessed, importance, status, is_demo, created_at, updated_at)
  values (v_a, (select id from public.categories where slug = 'politique'),
          'Réunion de quartier sur l''aménagement du marché',
          'Une réunion est annoncée pour discuter de l''aménagement du marché. Tous les habitants peuvent venir donner leur avis.',
          'Plateau',
          st_setsrid(st_makepoint(-4.017, 5.324), 4326)::geography,
          now() - interval '8 hours', false, 'faible', 'non_verifiee', true,
          now() - interval '8 hours', now() - interval '8 hours')
  returning id into v_id;

  -- 8. Environnement · information contestée
  insert into public.reports (author_id, category_id, title, body, place_name, location, occurred_at,
                              witnessed, importance, status, is_demo, created_at, updated_at)
  values (v_c, (select id from public.categories where slug = 'environnement'),
          'Déchets accumulés près du carrefour',
          'Des déchets s''accumulent près du carrefour depuis plusieurs jours.',
          'Carrefour, Cocody',
          st_setsrid(st_makepoint(-3.96, 5.38), 4326)::geography,
          now() - interval '2 days', true, 'faible', 'contestee', true,
          now() - interval '2 days', now() - interval '1 day')
  returning id into v_id;
  insert into public.status_history (report_id, old_status, new_status, reason, changed_by, changed_at)
  values (v_id, 'non_verifiee', 'contestee', 'Plusieurs habitants indiquent que le ramassage a eu lieu ce matin.', v_admin, now() - interval '1 day');
  insert into public.report_votes (report_id, user_id, kind, created_at)
  values (v_id, v_a, 'contest', now() - interval '30 hours'), (v_id, v_b, 'contest', now() - interval '28 hours');
end
$$;
