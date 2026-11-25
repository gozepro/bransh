// Partage de l'application : feuille de partage du téléphone si disponible, sinon WhatsApp.
export async function shareApp() {
  const data = {
    title: 'Bransh',
    text: 'Bransh : l’information au plus près de toi, vérifiée ensemble.',
    url: window.location.origin,
  }
  if (navigator.share) {
    try {
      await navigator.share(data)
    } catch {
      /* partage annulé */
    }
    return
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${data.text} ${data.url}`)}`, '_blank', 'noopener')
}
