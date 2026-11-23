# bransh.

> L'information au plus près de vous, vérifiée ensemble.

**Bransh** est une application web open source de signalement citoyen en temps réel, pensée d'abord pour Abidjan (Côte d'Ivoire) et réutilisable dans d'autres villes. Chacun peut signaler un fait observé (transport, sécurité, santé, environnement…), et la communauté ainsi que des vérificateurs le confirment ou le contestent.

> ⚠️ **Projet en développement (MVP).** Ne pas utiliser pour des alertes d'urgence : en cas de danger, contactez les services de secours.

## Fonctionnalités actuelles

- Fil d'actualité géolocalisé et carte interactive (chaleur, regroupement, points animés), avec filtres par catégorie
- Thème clair et sombre
- Formulaire de signalement guidé (titre, faits, catégorie, lieu, photo facultative)
- Photos compressées dans le navigateur, avec suppression des métadonnées (EXIF/GPS) et choix du cadrage
- Statuts de vérification (non vérifiée, en vérification, corroborée, confirmée, contestée, démentie, expirée)
- Boutons « Je confirme » / « Je conteste » et ajout de preuves
- Rôles : citoyen, vérificateur, modérateur, administrateur, avec historique justifié de chaque changement de statut
- Liens partageables (ex. WhatsApp) vers chaque signalement

## Pistes à venir

Score de confiance pondéré, notifications push, PWA hors-ligne, mode « low data », canal SMS/USSD, tableaux de bord pour ONG et collectivités, traduction (français, nouchi, anglais).
Les idées et contributions sont les bienvenues.

## Pile technique

- **Frontend** : React + Vite, carte MapLibre GL (fonds OpenFreeMap, données OpenStreetMap)
- **Backend** : [Supabase](https://supabase.com) (Postgres + PostGIS, authentification, stockage, règles de sécurité RLS)

## Lancer le projet en local

1. Crée un projet gratuit sur [supabase.com](https://supabase.com).
2. Dans le **SQL Editor**, exécute dans l'ordre les fichiers de `supabase/migrations/`.
3. Dans **Authentication**, pour le développement, tu peux désactiver « Confirm email ».
4. Copie `.env.example` en `.env` et renseigne l'URL du projet et la clé **anon / publishable** (jamais la clé `service_role`).
5. Installe et lance :

```bash
npm install
npm run dev
```

6. Pour tester la vérification, crée un compte puis passe-le en administrateur dans le SQL Editor :

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'ton-email@exemple.com');
```

## Structure

```
src/
  components/   écrans (fil, carte, formulaire, fiche, connexion)
  lib/          client Supabase, images, formats
supabase/
  migrations/   schéma SQL, droits d'accès, règles de sécurité
```

## Sécurité et vie privée

- Toutes les tables sont protégées par des règles RLS ; les actions sensibles passent par des fonctions SQL qui vérifient les droits.
- Ne publie **jamais** de clé secrète ni de fichier `.env`.
- Le retrait des métadonnées des photos est effectué dans le navigateur ; un retraitement côté serveur est prévu.
- Pour signaler une faille de sécurité, contacte le mainteneur en privé (GitHub Security Advisories) plutôt que d'ouvrir une issue publique.

## Contribuer

Les issues et pull requests sont bienvenues. Pour une grosse évolution, ouvre d'abord une issue pour en discuter.

## Licence

Voir le fichier `LICENSE`.
