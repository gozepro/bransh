import { SUPPORT } from '../config/support'
import { LEGAL_UPDATED } from '../config/app'

// Texte à faire relire par un juriste local avant le lancement public.
export default function Privacy() {
  const contact = SUPPORT.contactEmail
    ? SUPPORT.contactEmail
    : 'le mainteneur du projet (via la page GitHub de Bransh)'

  return (
    <div className="legal">
      <p className="muted">Dernière mise à jour : {LEGAL_UPDATED}</p>

      <h3>L'essentiel</h3>
      <p>
        Bransh est une application ouverte à tous qui permet de partager et de vérifier des informations locales. Nous
        collectons le minimum de données nécessaire pour la faire fonctionner. Nous ne vendons pas tes données
        personnelles (adresse e-mail, mot de passe, position précise).
      </p>

      <h3>Les données que nous collectons</h3>
      <ul>
        <li>
          <strong>Ton compte</strong> : adresse e-mail, nom affiché et mot de passe. Le mot de passe est stocké sous
          forme chiffrée, nous ne pouvons pas le lire.
        </li>
        <li>
          <strong>Tes contributions</strong> : signalements (titre, texte, catégorie, lieu, date), photos et preuves,
          confirmations et contestations. Ces contenus sont <strong>publics</strong> : toute personne qui ouvre Bransh
          peut les voir, avec ton nom affiché.
        </li>
        <li>
          <strong>Tes préférences</strong> : choix de notifications, et sur ton appareil seulement : thème et ville.
        </li>
        <li>
          <strong>Tes avis</strong> sur l'application, visibles uniquement par l'équipe.
        </li>
        <li>
          <strong>Tes demandes d'aide</strong> (sujet et message). L'équipe voit ton adresse e-mail complète pour te
          répondre. Pour gérer les rôles, les administrateurs ne voient qu'une version masquée de ton adresse.
        </li>
      </ul>

      <h3>Ta position</h3>
      <ul>
        <li>
          La détection de ta ville se fait <strong>sur ton appareil</strong> : ta position n'est pas envoyée à nos
          serveurs pour cela.
        </li>
        <li>
          Quand tu fais un signalement, nous enregistrons soit le centre de la commune choisie, soit ta position{' '}
          <strong>arrondie à environ 100 mètres</strong> si tu utilises « Ma position ». Sur la carte, les repères sont
          affichés de façon approximative.
        </li>
      </ul>

      <h3>Tes photos</h3>
      <p>
        Avant l'envoi, l'application réduit la taille de tes photos et supprime leurs métadonnées (position GPS cachée,
        modèle du téléphone). Les photos sont accessibles à toute personne qui possède leur adresse exacte.
      </p>

      <h3>Où sont stockées tes données ?</h3>
      <p>
        Les données sont stockées chez <strong>Supabase</strong>, dans un centre de données en Europe (Irlande).
        L'application est hébergée par <strong>Vercel</strong>. Les fonds de carte viennent d'<strong>OpenFreeMap</strong>{' '}
        (données OpenStreetMap) : ce service voit ton adresse IP quand la carte se charge. Nous n'utilisons ni publicité
        ni traceur publicitaire.
      </p>

      <h3>Combien de temps ?</h3>
      <p>
        Tes données sont conservées tant que ton compte existe. Si tu supprimes ton compte, tes signalements, tes votes,
        tes photos et tes avis sont supprimés. De courtes copies techniques de sauvegarde peuvent subsister brièvement.
      </p>

      <h3>Tes droits</h3>
      <p>
        Tu peux consulter et modifier ton nom, changer ton mot de passe et <strong>supprimer ton compte</strong>{' '}
        directement dans Paramètres → Gestion du compte. Pour toute autre demande (accès à tes données, correction,
        question), écris à {contact}.
      </p>

      <h3>Stockage sur ton appareil</h3>
      <p>
        Bransh enregistre sur ton appareil ta session de connexion, ton thème et ta ville. Il ne s'agit pas de cookies
        publicitaires.
      </p>

      <h3>Modifications</h3>
      <p>
        Cette politique peut évoluer avec l'application. La date de mise à jour est indiquée en haut de cette page.
      </p>
    </div>
  )
}
