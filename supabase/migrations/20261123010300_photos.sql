-- Bransh — stockage des photos et preuves (à exécuter dans Supabase > SQL Editor)

-- 1. Espace de stockage : lecture publique par lien, JPEG uniquement, 1,5 Mo max par fichier
--    (l'app compresse et convertit chaque image en JPEG avant l'envoi)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-media', 'report-media', true, 1572864, array['image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = 1572864,
      allowed_mime_types = array['image/jpeg'];

-- 2. Chacun ne peut envoyer des fichiers que dans son propre dossier (nommé d'après son identifiant)
drop policy if exists "bransh envoyer ses images" on storage.objects;
create policy "bransh envoyer ses images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'report-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Références des médias :
--    - l'auteur peut joindre des photos à son propre signalement
--    - tout utilisateur connecté peut ajouter une "preuve" à n'importe quel signalement
drop policy if exists "ajouter un média" on public.report_media;
create policy "ajouter un média" on public.report_media
  for insert to authenticated
  with check (
    uploader_id = auth.uid()
    and (
      kind = 'evidence'
      or exists (
        select 1 from public.reports r
        where r.id = report_id and r.author_id = auth.uid()
      )
    )
  );
