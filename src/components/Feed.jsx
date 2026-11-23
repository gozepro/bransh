import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { STATUS, timeAgo } from '../lib/format'
import { publicUrl } from '../lib/media'

export default function Feed({ refreshKey, onOpen }) {
  const [reports, setReports] = useState([])
  const [photos, setPhotos] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('reports_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(async ({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError(error.message)
        } else {
          setReports(data)
          if (data.length > 0) {
            const { data: media } = await supabase
              .from('report_media')
              .select('report_id, storage_path, focus_x, focus_y')
              .eq('kind', 'photo')
              .in('report_id', data.map((r) => r.id))
              .order('created_at')
            if (!cancelled && media) {
              const first = {}
              media.forEach((m) => {
                if (!first[m.report_id]) first[m.report_id] = m
              })
              setPhotos(first)
            }
          }
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  if (loading) return <p className="muted">Chargement du fil…</p>
  if (error) return <p className="error">Erreur : {error}</p>
  if (reports.length === 0)
    return <p className="muted">Aucune information pour l'instant. Sois le premier à signaler quelque chose !</p>

  return (
    <section>
      <h3>À la une près de chez vous</h3>
      {reports.map((r) => {
        const [label, tone] = STATUS[r.status] || ['—', 'grey']
        return (
          <article
            className="card report"
            key={r.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(r.id)}
            onKeyDown={(e) => e.key === 'Enter' && onOpen(r.id)}
          >
            <div className="row between">
              <span className="cat">{r.category_label}</span>
              <span className="row">
                {r.hidden && <span className="badge red">Masqué</span>}
                {r.importance === 'critique' && <span className="badge red">Critique</span>}
                {r.importance === 'eleve' && <span className="badge amber">Important</span>}
              </span>
            </div>
            <h2>{r.title}</h2>
            <p className="muted">{r.body}</p>
            {photos[r.id] && (
              <img
                className="thumb"
                src={publicUrl(photos[r.id].storage_path)}
                alt=""
                loading="lazy"
                style={{ objectPosition: `${photos[r.id].focus_x}% ${photos[r.id].focus_y}%` }}
              />
            )}
            <div className="row between meta">
              <span>
                📍 {r.place_name} · {timeAgo(r.created_at)}
              </span>
              <span className={`badge ${tone}`}>{label}</span>
            </div>
            <div className="row between meta">
              <span>{r.author_name}</span>
              <span>
                ✓ {r.confirmations} · ✕ {r.contestations}
              </span>
            </div>
          </article>
        )
      })}
    </section>
  )
}
