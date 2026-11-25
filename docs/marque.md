# Guide de marque : bransh.

Ce guide rassemble les règles d'identité de Bransh. Il sert à toute personne qui crée quelque chose pour le projet (affiche, post, présentation, interface) afin que tout se ressemble et se comprenne.

## 1. Le nom

- **bransh** se prononce comme « branche » en français. Le nom s'inspire de l'expression ivoirienne « branche-moi » (« mets-moi au courant »), et du sens de « être branché » : connecté et informé.
- Dans un logo ou un visuel : toujours en **minuscules, suivi du point orange** : `bransh.`
- Dans une phrase : « Bransh », avec une majuscule, sans point orange.
- Ne jamais écrire : BRANSH, Bransh App, Br@nsh, bransch.

## 2. La promesse

> **L'information au plus près de vous, vérifiée ensemble.**

Versions courtes pour les petits espaces :
- « Ce qui se passe chez toi, vérifié par ton quartier. »
- « Signale. Vérifie. Partage. »

Trois idées à faire passer : **proche** (ton quartier, ta ville), **vérifié** (chaque information a un statut et une justification), **ouvert** (gratuit, open source, fait avec les habitants).

## 3. La voix

- On **tutoie**. Phrases courtes, mots simples, un ton chaleureux et calme.
- On est **factuel, jamais alarmiste** : on dit ce qu'on sait, et comment on le sait. Pas de majuscules criardes, pas de points d'exclamation en série.
- On reconnaît ce qu'on ne sait pas : « Non vérifiée » est un statut honnête, pas une faute.
- On parle de **personnes**, pas d'« utilisateurs » : habitants, contributeurs, vérificateurs.

| À éviter | À préférer |
|---|---|
| « ALERTE !!! Catastrophe en cours » | « Route inondée à Adjamé. Évitez le secteur si possible. » |
| « Fake news détectée » | « Information contestée : plusieurs habitants indiquent le contraire. » |
| « L'utilisateur doit se connecter » | « Connecte-toi pour confirmer cette information. » |

## 4. Le logo

Fichiers dans `public/brand/` :

| Fichier | Usage |
|---|---|
| `logo-bransh.svg` | Mot-symbole sur fond **clair** (texte noir, point orange) |
| `logo-bransh-clair.svg` | Mot-symbole sur fond **sombre** (texte blanc, point orange) |
| `logo-icon.svg` | Icône carrée : « b. » sur fond orange (application, réseaux sociaux) |

Règles :
- **Zone de protection** : laisse autour du logo un espace au moins égal à la hauteur du point orange.
- **Taille minimale** : 80 px de large pour le mot-symbole, 24 px pour l'icône.
- **Ne pas** : étirer, pivoter, changer la police, recolorer le point, ajouter une ombre, placer sur un fond chargé sans contraste.

## 5. Les couleurs

| Rôle | Clair | Sombre |
|---|---|---|
| Fond | `#faf7f2` | `#0d0e12` |
| Texte | `#1f1f1d` | `#f1f1ee` |
| Orange de marque (accents, point du logo) | `#ee6c2f` | `#ff7a3d` |
| Boutons principaux (texte blanc) | `#d85a1f` | `#e8601f` |
| Vert (confirmé) | `#4f7a55` | `#6fbf7c` |
| Ambre (en vérification) | `#a8720c` | `#e3a928` |
| Rouge (contesté, critique) | `#b83a2e` | `#f0675a` |

Couleurs des catégories (carte et pastilles) : Transport `#ff7a3d` · Sécurité `#ef4b3c` · Santé `#2fb5c4` · Politique `#7b7ff0` · Environnement `#58b06a` · Alertes `#ff3b3b`.

**Lisibilité** : du texte blanc sur l'orange clair (`#ee6c2f`) manque de contraste. Sur un bouton, utilise l'orange « bouton » ci-dessus. Ne transmets jamais une information **uniquement** par la couleur : ajoute toujours un mot ou une icône.

## 6. Les polices

- **Manrope** (graisse 800) pour les titres et le logo.
- **DM Sans** pour le texte courant.
- Les deux sont libres (licence SIL OFL) et **hébergées avec l'application**, sans appel à un service externe.

## 7. Images et partage

- **Image de partage** (WhatsApp, Facebook) : `public/og-image.jpg`, 1200 × 630 px, moins de 300 Ko. Quand le nom de domaine change, mets à jour les adresses `og:url` et `og:image` dans `index.html`.
- **Photos de signalements** : jamais de visage reconnaissable sans accord, jamais de plaque d'immatriculation lisible, jamais d'image choquante comme illustration.
- **Univers visuel** : fond sombre, routes fines, points lumineux colorés par catégorie.

## 8. Réseaux sociaux

- Nom visé : **@bransh** sur toutes les plateformes. À réserver avant la première communication.
- Biographie type : « L'information au plus près de vous, vérifiée ensemble. Gratuit, open source, fait avec les habitants. »
- Chaque publication d'information doit indiquer son **statut** (non vérifiée, en vérification, confirmée) et sa **source**.

## 9. Nom et logo : une règle à choisir

La licence du code (ouverte) ne dit rien sur le **nom** et le **logo**. Décide d'une règle claire et écris-la ici. Proposition : « Tout le monde peut réutiliser et améliorer le code. Les versions modifiées publiées sous un autre nom ne doivent pas utiliser le nom Bransh ni son logo sans accord. » Cela évite qu'une copie douteuse se fasse passer pour le projet.
