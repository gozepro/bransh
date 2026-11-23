// Fond de carte : styles gratuits et sans clé d'OpenFreeMap (données © contributeurs OpenStreetMap).
// Le style clair est utilisé tel quel ; le style sombre est dérivé du même style (routes fines sur fond noir).
const BASE_URL = 'https://tiles.openfreemap.org/styles/positron'

let basePromise = null

export function loadBaseStyle() {
  if (!basePromise) {
    basePromise = fetch(BASE_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Impossible de charger le fond de carte.')
        return res.json()
      })
      .catch((err) => {
        basePromise = null
        throw err
      })
  }
  return basePromise
}

// Police utilisée pour les étiquettes (reprise du style de base pour être sûr qu'elle existe)
export function labelFont(base) {
  for (const layer of base.layers) {
    const font = layer.layout && layer.layout['text-font']
    if (Array.isArray(font) && font.every((f) => typeof f === 'string')) return font
  }
  return ['Noto Sans Regular']
}

const DARK = {
  bg: '#0b0c10',
  water: '#05070b',
  land: '#10121a',
  building: '#161922',
  roads: { major: '#eef0f6', mid: '#b4bac8', minor: '#7a8194', faint: '#3d4352' },
  opacity: { major: 0.95, mid: 0.7, minor: 0.5, faint: 0.4 },
  text: '#a3a9b8',
  halo: '#0b0c10',
}

function roadTier(id) {
  if (/motorway|trunk|primary/.test(id)) return 'major'
  if (/secondary|tertiary/.test(id)) return 'mid'
  if (/rail|transit|ferry|aerialway/.test(id)) return 'faint'
  return 'minor'
}

function roadWidth(tier) {
  const k = { major: 1.8, mid: 1.2, minor: 0.7, faint: 0.5 }[tier]
  return ['interpolate', ['exponential', 1.5], ['zoom'], 8, 0.2 * k, 12, 0.8 * k, 16, 3 * k, 20, 10 * k]
}

function hidden(layer) {
  return { ...layer, layout: { ...(layer.layout || {}), visibility: 'none' } }
}

function darken(base) {
  const style = JSON.parse(JSON.stringify(base))

  style.layers = style.layers.map((layer) => {
    const sl = layer['source-layer']
    const id = layer.id

    switch (layer.type) {
      case 'background':
        return { ...layer, paint: { 'background-color': DARK.bg } }

      case 'fill':
        if (sl === 'water') return { ...layer, paint: { 'fill-color': DARK.water } }
        if (sl === 'building') return { ...layer, paint: { 'fill-color': DARK.building, 'fill-opacity': 0.8 } }
        return { ...layer, paint: { 'fill-color': DARK.land, 'fill-opacity': 0.5 } }

      case 'line': {
        if (sl === 'transportation') {
          if (/casing|outline/.test(id)) return hidden(layer)
          const tier = roadTier(id)
          return {
            ...layer,
            paint: {
              'line-color': DARK.roads[tier],
              'line-opacity': DARK.opacity[tier],
              'line-width': roadWidth(tier),
            },
          }
        }
        if (sl === 'waterway') return { ...layer, paint: { 'line-color': '#0c1119', 'line-width': 0.6 } }
        if (sl === 'boundary') {
          return { ...layer, paint: { 'line-color': '#2a2f3b', 'line-width': 0.6, 'line-dasharray': [2, 2] } }
        }
        return { ...layer, paint: { 'line-color': '#2a2f3b', 'line-width': 0.6 } }
      }

      case 'symbol': {
        const hasText = layer.layout && layer.layout['text-field']
        if (!hasText || sl === 'poi' || sl === 'housenumber' || sl === 'mountain_peak') return hidden(layer)
        return {
          ...layer,
          paint: {
            'text-color': DARK.text,
            'text-halo-color': DARK.halo,
            'text-halo-width': 1.2,
          },
        }
      }

      default:
        return hidden(layer)
    }
  })

  return style
}

export function buildStyle(base, theme) {
  return theme === 'dark' ? darken(base) : JSON.parse(JSON.stringify(base))
}
