const MAX_SIDE = 1280
const MAX_INPUT_BYTES = 15 * 1024 * 1024

// Redimensionne et ré-encode l'image en JPEG léger.
// Le ré-encodage via un canvas supprime toutes les métadonnées (EXIF : position GPS, modèle du téléphone…).
export async function prepareImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Ce fichier n’est pas une image.')
  if (file.size > MAX_INPUT_BYTES) throw new Error('Image trop lourde (15 Mo maximum).')

  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Format d’image non pris en charge. Utilise une photo JPG, PNG ou WebP.')
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // fond blanc pour les PNG transparents
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.75))
  if (!blob) throw new Error('Impossible de préparer l’image.')
  return blob
}
