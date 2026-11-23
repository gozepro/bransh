import { useCallback, useEffect, useState } from 'react'
import { CITIES, DEFAULT_CITY, nearestCity } from './cities'

const KEY = 'bransh-city'

function readChoice() {
  try {
    const id = localStorage.getItem(KEY)
    return CITIES.find((c) => c.id === id) || null
  } catch {
    return null
  }
}

// Ville affichée : celle choisie à la main, sinon celle détectée à l'ouverture, sinon Abidjan.
// La position reste sur l'appareil : la ville la plus proche est calculée localement, rien n'est envoyé.
export function useCity() {
  const [city, setCity] = useState(() => readChoice() || DEFAULT_CITY)
  const [outside, setOutside] = useState(false)
  const [detecting, setDetecting] = useState(false)

  const detect = useCallback(() => {
    if (!navigator.geolocation) return
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const hit = nearestCity(pos.coords.latitude, pos.coords.longitude)
        if (hit) {
          setCity(hit.city)
          setOutside(false)
        } else {
          setCity(DEFAULT_CITY)
          setOutside(true)
        }
        setDetecting(false)
      },
      () => setDetecting(false),
      { timeout: 8000, maximumAge: 600000 },
    )
  }, [])

  // Détection au lancement, sauf si la personne a déjà choisi sa ville
  useEffect(() => {
    if (!readChoice()) detect()
  }, [detect])

  const choose = (id) => {
    const next = CITIES.find((c) => c.id === id)
    if (!next) return
    setCity(next)
    setOutside(false)
    try {
      localStorage.setItem(KEY, id)
    } catch {
      /* stockage indisponible : le choix ne sera simplement pas mémorisé */
    }
  }

  // « Ma position » : on oublie le choix manuel et on détecte à nouveau
  const locate = () => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignoré */
    }
    detect()
  }

  return { city, outside, detecting, choose, locate }
}
