import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { STATUS } from '../lib/format'

const CATEGORIES = [
  { slug: 'all', label: 'Tout voir', color: '#1f1f1d' },
  { slug: 'transport', label: 'Transport', color: '#ee6c2f' },
  { slug: 'securite', label: 'Sécurité', color: '#b83a2e' },
  { slug: 'sante', label: 'Santé', color: '#2f8f9d' },
  { slug: 'politique', label: 'Politique', color: '#5b5fc7' },
  { slug: 'environnement', label: 'Environnement', color: '#4f7a55' },
  { slug: 'alertes', label: 'Alertes', color: '#7a1f1f' },
]

const COLOR_BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.color]))

// Petit décalage stable (~±400 m) pour que les signalements d'une même commune
// ne soient pas empilés exactement au même point.
function jitter(id, salt) {
  let h = salt
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000
  return (h / 1000 - 0.5) * 0.008
}

export default function MapView({ onOpen }) {
  const containerRef = useRef(null)
  const layerRef = useRef(null)
  const openRef = useRef(onOpen)
  const [reports, setReports] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    openRef.current = onOpen
  })

  // Création de la carte (centrée sur Abidjan)
  useEffect(() => {
    const map = L.map(containerRef.current).setView([5.345, -4.025], 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    return () => {
      map.remove()
      layerRef.current = null
    }
  }, [])

  // Chargement des signalements
  useEffect(() => {
    let cancelled = false
    supabase
      .from('reports_feed')
      .select('id, title, place_name, status, category_slug, category_label, lat, lng')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setReports(data)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Dessin des repères selon le filtre
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.clearLayers()

    reports
      .filter((r) => filter === 'all' || r.category_slug === filter)
      .forEach((r) => {
        const marker = L.circleMarker([r.lat + jitter(r.id, 1), r.lng + jitter(r.id, 7)], {
          radius: 11,
          color: '#ffffff',
          weight: 2,
          fillColor: COLOR_BY_SLUG[r.category_slug] || '#ee6c2f',
          fillOpacity: 0.95,
        })

        // Contenu construit avec textContent : le texte des utilisateurs n'est jamais interprété comme du HTML
        const box = document.createElement('div')
        box.className = 'map-popup'
        const cat = document.createElement('div')
        cat.className = 'map-popup-cat'
        cat.textContent = `${r.category_label} · ${r.place_name}`
        const title = document.createElement('strong')
        title.textContent = r.title
        const status = document.createElement('div')
        status.className = 'map-popup-status'
        status.textContent = STATUS[r.status]?.[0] || ''
        const btn = document.createElement('button')
        btn.textContent = 'Voir la fiche →'
        btn.onclick = () => openRef.current(r.id)
        box.append(cat, title, status, btn)

        marker.bindPopup(box)
        marker.addTo(layer)
      })
  }, [reports, filter])

  const count = reports.filter((r) => filter === 'all' || r.category_slug === filter).length

  return (
    <div>
      <div className="chips map-filters">
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            className={filter === c.slug ? 'chip active' : 'chip'}
            onClick={() => setFilter(c.slug)}
          >
            <span className="dot-color" style={{ background: c.color }} />
            {c.label}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="map" />

      {loading && <p className="muted">Chargement des repères…</p>}
      {error && <p className="error">Erreur : {error}</p>}
      {!loading && !error && (
        <p className="hint">
          {count} info{count > 1 ? 's' : ''} sur la carte · les positions sont approximatives.
        </p>
      )}
    </div>
  )
}
