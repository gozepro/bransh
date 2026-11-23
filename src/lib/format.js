// [libellé, couleur]
export const STATUS = {
  non_verifiee: ['Non vérifiée', 'grey'],
  en_verification: ['En vérification', 'amber'],
  corroboree: ['Corroborée', 'green'],
  confirmee: ['Confirmée', 'green'],
  contestee: ['Contestée', 'red'],
  dementie: ['Démentie', 'red'],
  expiree: ['Expirée', 'grey'],
}

export const IMPORTANCE = {
  faible: 'Faible',
  modere: 'Modérée',
  eleve: 'Élevée',
  critique: 'Critique',
}

export function timeAgo(iso) {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.round(h / 24)} j`
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}
