-- Bransh — règle côté serveur sur le nom affiché (2 à 40 caractères)
-- À exécuter dans Supabase > SQL Editor.

alter table public.profiles
  drop constraint if exists profiles_display_name_length;

alter table public.profiles
  add constraint profiles_display_name_length
  check (char_length(trim(display_name)) between 2 and 40) not valid;

-- Contrôle les noms existants : si cette ligne échoue, corrige d'abord les noms trop courts ou trop longs
alter table public.profiles validate constraint profiles_display_name_length;
