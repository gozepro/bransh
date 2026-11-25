// Réglages de la page « Soutenir Bransh ».
// Remplis ce fichier, enregistre-le, puis fais un « git push » : la page se met à jour toute seule.
// Une méthode de don n'apparaît dans l'application que si elle est renseignée ici.

export const SUPPORT = {
  // Adresse de ton dépôt GitHub (pour « contribuer au code »)
  repoUrl: 'https://github.com/gozepro/bransh',

  // Adresse e-mail publique pour devenir vérificateur ou bénévole (idéalement une adresse dédiée au projet)
  contactEmail: 'gozeandrepro@gmail.com',

  // Objectif affiché sous forme de barre de progression (laisse null pour ne rien afficher)
  // Exemple : { label: 'Payer l’hébergement de la première année', target: 150000, raised: 0, currency: 'FCFA' }
  goal: null,

  // Moyens de don. Types possibles :
  //   kind: 'number' → un numéro Mobile Money que l'on peut copier
  //   kind: 'link'   → un lien de paiement (page de don, lien Wave/CinetPay, GitHub Sponsors, Open Collective…)
  // Exemples (à adapter, en retirant les « // ») :
  //   { id: 'wave',   label: 'Wave',         kind: 'number', value: '+225 00 00 00 00 00', note: 'Au nom de …' },
  //   { id: 'orange', label: 'Orange Money', kind: 'number', value: '+225 00 00 00 00 00' },
  //   { id: 'mtn',    label: 'MTN MoMo',     kind: 'number', value: '+225 00 00 00 00 00' },
  //   { id: 'lien',   label: 'Faire un don en ligne', kind: 'link', value: 'https://…' },
  methods: [],

  // Texte d'explication (à adapter ; ne promets que ce que tu pourras tenir)
  intro:
    'Bransh est gratuite et ouverte à tous. L’hébergement, la base de données, les cartes et plus tard les alertes ont un coût. Chaque contribution aide à garder le service en ligne et à le faire évoluer.',
}
