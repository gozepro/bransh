# Contribuer à Bransh

Merci de t'intéresser à Bransh ! Il y a de la place pour tout le monde : code, design, vérification, traduction, idées.

## Sans écrire de code

- **Vérifier des informations** : dans l'application, Paramètres → « Rejoindre l'équipe » → « Vérificateur de quartier ».
- **Signaler un bug ou proposer une idée** : ouvre une *issue* sur GitHub (des modèles sont proposés).
- **Faire connaître Bransh** dans ton quartier, ton association, ton université.
- **Relire les textes** : tournures, fautes, clarté.

## Lancer le projet en local

Prérequis : [Node.js](https://nodejs.org) (version LTS) et un projet gratuit [Supabase](https://supabase.com).

1. Récupère le code : `git clone https://github.com/gozepro/bransh.git` puis `cd bransh`.
2. Dans le **SQL Editor** de Supabase, exécute dans l'ordre tous les fichiers de `supabase/migrations/`.
3. Copie `.env.example` en `.env` et renseigne l'adresse du projet et la clé **anon / publishable**. N'utilise **jamais** la clé `service_role`.
4. `npm install` puis `npm run dev`.

Pour tester la vérification, passe ton compte en administrateur (voir le README).

## Proposer une modification

1. Ouvre une *issue* pour les gros changements, afin d'en discuter avant de coder.
2. Crée une branche : `git checkout -b ma-modification`.
3. Fais des changements **petits et ciblés**. Un sujet par *pull request*.
4. Vérifie que `npm run build` passe sans erreur.
5. Ouvre une *pull request* en expliquant **ce que tu changes et pourquoi**, avec une capture d'écran pour tout changement visible.

Messages de commit : une phrase claire à l'infinitif ou au présent (« Ajouter la ville de Bouaké »).

## Conventions

- **Langue** : interface et commentaires en français. On tutoie, voir `docs/marque.md`.
- **Code** : React, composants simples dans `src/components/`, utilitaires dans `src/lib/`.
- **Accessibilité** : boutons avec libellé, contrastes suffisants, rien d'important transmis par la couleur seule.
- **Poids** : l'application doit rester légère (connexions lentes). Évite les grosses dépendances.

## Base de données

- Chaque changement = **un nouveau fichier** dans `supabase/migrations/`, daté et numéroté. Ne modifie jamais une migration déjà appliquée.
- Toute table a des règles de sécurité (RLS). Les actions sensibles passent par des fonctions SQL qui vérifient les droits.
- Teste ton script sur un projet Supabase à toi avant de le proposer.

## Ajouter ta ville

Ouvre `src/lib/cities.js` et ajoute une ligne avec le nom, le pays, la latitude et la longitude du centre-ville. Propose-la en *pull request* ou via le modèle « Ajouter ma ville ».

## Sécurité et vie privée

- Ne publie **jamais** de clé secrète, de fichier `.env` ni de données personnelles réelles.
- Pour signaler une faille, **ne crée pas d'issue publique** : utilise les *Security Advisories* de GitHub (onglet « Security ») pour écrire en privé au mainteneur.

## Comportement attendu

Bransh parle de la vie des gens : on y est respectueux. Pas d'insultes, de harcèlement ni de discrimination. Les désaccords se règlent par des arguments et des faits. Les mainteneurs peuvent modérer ou retirer un contenu ou un contributeur qui ne respecte pas ces règles.
