import { supabase } from './supabase'
import { prepareImage } from './image'

const BUCKET = 'report-media'

// kind : 'photo' (de l'auteur) ou 'evidence' (preuve ajoutée par un contributeur)
// focus : point du cadrage à mettre en valeur, en % ({ x, y }), 50/50 = centre
export async function uploadReportImage({ file, reportId, userId, kind, focus }) {
  const blob = await prepareImage(file)
  const path = `${userId}/${crypto.randomUUID()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (uploadError) throw new Error(uploadError.message)

  const { error: dbError } = await supabase
    .from('report_media')
    .insert({
      report_id: reportId,
      uploader_id: userId,
      storage_path: path,
      kind,
      focus_x: focus?.x ?? 50,
      focus_y: focus?.y ?? 50,
    })
  if (dbError) throw new Error(dbError.message)
}

export function publicUrl(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
