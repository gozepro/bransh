import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre 6 charge son calcul de carte dans un « worker » dont il devine l'adresse lui-même.
// Avec Vite, cette devinette échoue (« Worker failed to load ») : on lui donne l'adresse exacte.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { supabase } from '../lib/supabase'
import { STATUS } from '../lib/format'
import { loadBaseStyle, buildStyle, labelFont } from '../lib/mapStyle'

maplibregl.setWorkerUrl(workerUrl)

const CATEGORIES = [
  { slug: 'all', label: 'Tout voir', color: '#8d93a3' },
  { slug: 'transport', label: 'Transport', color: '#ff7a3d' },
  { slug: 'securite', label: 'Sécurité', color: '#ef4b3c' },
  { slug: 'sante', label: 'Santé', color: '#2fb5c4' },
  { slug: 'politique', label: 'Politique', color: '#7b7ff0' },
  { slug: 'environnement', label: 'Environnement', color: '#58b06a' },
  { slug: 'alertes', label: 'Alertes', color: '#ff3b3b' },
]

const COLOR_EXPRESSION = [
  'match',
  ['get', 'cat'],
  ...CATEGORIES.filter((c) => c.slug !== 'all').flatMap((c) => [c.slug, c.color]),
  '#ff7a3d',
]

const EMPTY = { type: 'FeatureCollection', features: [] }

// Léger décalage stable (~±400 m) pour ne pas empiler les signalements d'une même commune
function jitter(id, salt) {
  let h = salt
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000
  return (h / 1000 - 0.5) * 0.008
}

function toFeatureCollection(reports, filter) {
  const now = Date.now()
  const weights = { critique: 1, eleve: 0.8, modere: 0.5, faible: 0.3 }
  return {
    type: 'FeatureCollection',
    features: reports
      .filter((r) => filter === 'all' || r.category_slug === filter)
      .map((r) => {
        const ageHours = (now - new Date(r.created_at).getTime()) / 3600000
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [r.lng + jitter(r.id, 7), r.lat + jitter(r.id, 1)] },
          properties: {
            id: r.id,
            title: r.title,
            place: r.place_name,
            status: STATUS[r.status]?.[0] || '',
            cat: r.category_slug,
            catLabel: r.category_label,
            w: weights[r.importance] ?? 0.5,
            pulse: r.importance === 'critique' || r.importance === 'eleve' || ageHours < 2 ? 1 : 0,
          },
        }
      }),
  }
}

export default function MapView({ onOpen, theme, center }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const baseRef = useRef(null)
  const appliedTheme = useRef(null)
  const themeRef = useRef(theme)
  const centerRef = useRef(center)
  const openRef = useRef(onOpen)
  const fcRef = useRef(EMPTY)
  const heatRef = useRef(true)
  const handlersRef = useRef(false)

  const [reports, setReports] = useState([])
  const [filter, setFilter] = useState('all')
  const [heat, setHeat] = useState(true)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('custom') // 'custom' : style sombre recoloré · 'filter' : style clair + filtre sombre
  const [issue, setIssue] = useState(null)
  const modeRef = useRef('custom')
  const tilesRef = useRef(false)
  const styleLoadedRef = useRef(false)
  const firstErrorRef = useRef(null)

  useEffect(() => {
    openRef.current = onOpen
    themeRef.current = theme
    heatRef.current = heat
  })

  // ---------- Création de la carte ----------
  useEffect(() => {
    let cancelled = false
    let map = null

    function installLayers() {
      if (!map || map.getSource('reports')) return
      const font = labelFont(baseRef.current)

      map.addSource('reports', { type: 'geojson', data: fcRef.current, cluster: true, clusterMaxZoom: 14, clusterRadius: 46 })
      map.addSource('reports-heat', { type: 'geojson', data: fcRef.current })

      // Carte de chaleur : zones les plus actives
      map.addLayer({
        id: 'heat',
        type: 'heatmap',
        source: 'reports-heat',
        layout: { visibility: heatRef.current ? 'visible' : 'none' },
        paint: {
          'heatmap-weight': ['get', 'w'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 15, 2],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 18, 13, 38, 16, 70],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.85, 15, 0.3],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(255,122,61,0)',
            0.2, 'rgba(255,122,61,0.25)',
            0.5, 'rgba(255,150,60,0.55)',
            0.8, 'rgba(255,200,90,0.75)',
            1, 'rgba(255,245,200,0.9)',
          ],
        },
      })

      // Groupes de signalements
      map.addLayer({
        id: 'clusters-glow',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#ff7a3d',
          'circle-opacity': 0.25,
          'circle-blur': 0.6,
          'circle-radius': ['step', ['get', 'point_count'], 24, 10, 30, 30, 38],
        },
      })
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#ff7a3d',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 30, 22],
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'reports',
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': font, 'text-size': 12 },
        paint: { 'text-color': '#ffffff' },
      })

      // Signalements individuels : halo, onde pulsée (récents ou importants), point lumineux
      const single = ['!', ['has', 'point_count']]
      map.addLayer({
        id: 'pt-glow',
        type: 'circle',
        source: 'reports',
        filter: single,
        paint: { 'circle-color': COLOR_EXPRESSION, 'circle-opacity': 0.22, 'circle-blur': 0.7, 'circle-radius': 16 },
      })
      map.addLayer({
        id: 'pt-pulse',
        type: 'circle',
        source: 'reports',
        filter: ['all', single, ['==', ['get', 'pulse'], 1]],
        paint: { 'circle-color': COLOR_EXPRESSION, 'circle-opacity': 0.5, 'circle-radius': 10 },
      })
      map.addLayer({
        id: 'pt-core',
        type: 'circle',
        source: 'reports',
        filter: single,
        paint: {
          'circle-color': COLOR_EXPRESSION,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 16, 9],
          'circle-stroke-color': themeRef.current === 'dark' ? '#0b0c10' : '#ffffff',
          'circle-stroke-width': 1.5,
        },
      })

      if (!handlersRef.current) {
        handlersRef.current = true

        map.on('click', 'clusters', async (e) => {
          const feature = e.features && e.features[0]
          if (!feature) return
          const zoom = await map.getSource('reports').getClusterExpansionZoom(feature.properties.cluster_id)
          map.easeTo({ center: feature.geometry.coordinates, zoom })
        })

        map.on('click', 'pt-core', (e) => {
          const feature = e.features && e.features[0]
          if (!feature) return
          const p = feature.properties

          // Le texte des utilisateurs est inséré via textContent : jamais interprété comme du HTML
          const box = document.createElement('div')
          box.className = 'map-popup'
          const cat = document.createElement('div')
          cat.className = 'map-popup-cat'
          cat.textContent = `${p.catLabel} · ${p.place}`
          const title = document.createElement('strong')
          title.textContent = p.title
          const status = document.createElement('div')
          status.className = 'map-popup-status'
          status.textContent = p.status
          const btn = document.createElement('button')
          btn.textContent = 'Voir la fiche →'
          btn.onclick = () => openRef.current(p.id)
          box.append(cat, title, status, btn)

          new maplibregl.Popup({ offset: 14, maxWidth: '260px' })
            .setLngLat(feature.geometry.coordinates)
            .setDOMContent(box)
            .addTo(map)
        })

        for (const layer of ['clusters', 'pt-core']) {
          map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'))
          map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''))
        }
      }
    }

    const timers = []

    // Si le style sombre personnalisé est refusé, on retombe sur le style clair + un filtre sombre
    function fallback(reason) {
      if (!map || modeRef.current === 'filter') return
      console.warn('[Bransh carte] style sombre personnalisé abandonné :', reason)
      modeRef.current = 'filter'
      setMode('filter')
      map.setStyle(buildStyle(baseRef.current, 'light'))
    }

    loadBaseStyle()
      .then((base) => {
        if (cancelled || !containerRef.current) return
        baseRef.current = base
        try {
          map = new maplibregl.Map({
            container: containerRef.current,
            style: buildStyle(base, themeRef.current),
            center: centerRef.current,
            zoom: 11.3,
            attributionControl: { compact: true },
          })
        } catch (err) {
          console.warn('[Bransh carte]', err)
          setError('Ton appareil ne permet pas d’afficher la carte avancée.')
          setLoading(false)
          return
        }
        appliedTheme.current = themeRef.current
        mapRef.current = map
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
        map.addControl(
          new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, trackUserLocation: false }),
          'bottom-right',
        )

        map.on('style.load', () => {
          styleLoadedRef.current = true
          installLayers()
        })
        map.on('load', installLayers)
        if (map.isStyleLoaded()) installLayers()

        map.on('sourcedata', (e) => {
          if (e.dataType === 'source' && e.tile) {
            tilesRef.current = true
            setIssue(null)
          }
        })

        map.on('error', (e) => {
          const msg = (e && e.error && e.error.message) || 'Erreur inconnue'
          console.warn('[Bransh carte]', msg)
          if (!firstErrorRef.current) firstErrorRef.current = msg
          if (!map.isStyleLoaded() && themeRef.current === 'dark' && /layers\[|paint|layout|source|validat|expected/i.test(msg)) {
            fallback(msg)
          }
        })

        // Garde-fous : style non chargé après 5 s, aucune tuile après 9 s
        timers.push(
          setTimeout(() => {
            if (!styleLoadedRef.current && themeRef.current === 'dark') fallback('le style ne s’est pas chargé')
          }, 5000),
        )
        timers.push(
          setTimeout(() => {
            if (!tilesRef.current) {
              setIssue(
                firstErrorRef.current ||
                  'Aucune tuile reçue : réseau lent, bloqueur de publicités, ou service de fond de carte indisponible.',
              )
            }
          }, 9000),
        )

        setReady(true)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      handlersRef.current = false
      if (map) map.remove()
      mapRef.current = null
    }
  }, [])

  // ---------- Changement de thème ----------
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !baseRef.current || appliedTheme.current === theme) return
    appliedTheme.current = theme
    map.setStyle(buildStyle(baseRef.current, modeRef.current === 'custom' ? theme : 'light'))
  }, [theme, ready])

  // ---------- Changement de ville ----------
  const lng = center[0]
  const lat = center[1]
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.flyTo({ center: [lng, lat], zoom: 11.3, essential: true })
  }, [lng, lat, ready])

  // ---------- Chargement des signalements ----------
  useEffect(() => {
    let cancelled = false
    supabase
      .from('reports_feed')
      .select('id, title, place_name, status, importance, created_at, category_slug, category_label, lat, lng')
      .order('created_at', { ascending: false })
      .limit(300)
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

  // ---------- Envoi des données à la carte ----------
  useEffect(() => {
    fcRef.current = toFeatureCollection(reports, filter)
    const map = mapRef.current
    if (!map) return
    try {
      map.getSource('reports')?.setData(fcRef.current)
      map.getSource('reports-heat')?.setData(fcRef.current)
    } catch {
      /* la carte n'est pas encore prête : les données seront posées au chargement du style */
    }
  }, [reports, filter, ready])

  // ---------- Carte de chaleur ----------
  useEffect(() => {
    const map = mapRef.current
    try {
      if (map && map.getLayer('heat')) map.setLayoutProperty('heat', 'visibility', heat ? 'visible' : 'none')
    } catch {
      /* ignoré */
    }
  }, [heat])

  // ---------- Animation des points récents ou importants ----------
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf
    let last = 0
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      if (now - last < 40 || document.hidden) return
      last = now
      const map = mapRef.current
      try {
        if (!map || !map.getLayer('pt-pulse')) return
        const t = (now % 2000) / 2000
        map.setPaintProperty('pt-pulse', 'circle-radius', 8 + 22 * t)
        map.setPaintProperty('pt-pulse', 'circle-opacity', 0.6 * (1 - t))
      } catch {
        /* ignoré */
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const count = reports.filter((r) => filter === 'all' || r.category_slug === filter).length

  return (
    <div className="map-page">
      <div ref={containerRef} className={mode === 'filter' && theme === 'dark' ? 'map-canvas map-inverted' : 'map-canvas'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      <div className="map-top">
        <div className="map-chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              className={filter === c.slug ? 'map-chip active' : 'map-chip'}
              onClick={() => setFilter(c.slug)}
            >
              <span className="dot-color" style={{ background: c.color }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="map-tools">
        <button className={heat ? 'map-tool active' : 'map-tool'} onClick={() => setHeat((h) => !h)}>
          🔥 Chaleur
        </button>
      </div>

      <div className="map-count">
        {loading || !ready ? 'Chargement de la carte…' : error ? '' : `${count} info${count > 1 ? 's' : ''} · positions approximatives`}
      </div>

      {(error || issue) && <div className="map-error">⚠️ {error || issue}</div>}
    </div>
  )
}
