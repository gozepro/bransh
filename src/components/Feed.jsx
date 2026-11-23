import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { STATUS, timeAgo } from '../lib/format'
import { publicUrl } from '../lib/media'
import { CITY_RADIUS_KM, distanceKm } from '../lib/cities'

export default function Feed({ refreshKey, onOpen, city }) {
  const [reports, setReports] = useState([])
  const [photos, setPhotos] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('reports_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150)
      .then(async ({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }

        // Seuls les signalements proches de la ville affichée
        const nearby = data
          .filter((r) => distanceKm({ lat: r.lat, lng: r.lng }, city) <= CITY_RADIUS_KM)
          .slice(0, 50)
        setReports(nearby)

        if (nearby.length > 0) {
          const { data: media } = await supabase
            .from('report_media')
            .select('report_id, storage_path, focus_x, focus_y')
            .eq('kind', 'photo')
            .in('report_id', nearby.map((r) => r.id))
            .order('created_at')
          if (!cancelled && media) {
            const first = {}
            media.forEach((m) => {
              if (!first[m.report_id]) first[m.report_id] = m
            })
            setPhotos(first)
          }
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey, city])

  if (loading) return <p className="muted">Chargement du fil…</p>
  if (error) return <p className="error">Erreur : {error}</p>
  if (reports.length === 0)
    return (
      <p className="muted">
        Aucune information à {city.name} pour l'instant. Sois le premier à signaler quelque chose !
      </p>
    )

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
                {r.is_demo && <span className="badge amber">Exemple</span>}
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
