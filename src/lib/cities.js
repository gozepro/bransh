// Villes où Bransh peut s'afficher. Pour ajouter la tienne : ajoute une ligne ici (pull request bienvenue !).
// La première ville est la ville par défaut.
export const CITIES = [
  { id: 'abidjan', name: 'Abidjan', country: 'Côte d’Ivoire', lat: 5.345, lng: -4.025 },
  { id: 'bouake', name: 'Bouaké', country: 'Côte d’Ivoire', lat: 7.69, lng: -5.03 },
  { id: 'yamoussoukro', name: 'Yamoussoukro', country: 'Côte d’Ivoire', lat: 6.83, lng: -5.29 },
  { id: 'san-pedro', name: 'San-Pédro', country: 'Côte d’Ivoire', lat: 4.75, lng: -6.64 },
  { id: 'daloa', name: 'Daloa', country: 'Côte d’Ivoire', lat: 6.88, lng: -6.45 },
  { id: 'korhogo', name: 'Korhogo', country: 'Côte d’Ivoire', lat: 9.46, lng: -5.63 },
  { id: 'man', name: 'Man', country: 'Côte d’Ivoire', lat: 7.41, lng: -7.55 },
  { id: 'dakar', name: 'Dakar', country: 'Sénégal', lat: 14.72, lng: -17.47 },
  { id: 'accra', name: 'Accra', country: 'Ghana', lat: 5.6, lng: -0.19 },
  { id: 'lome', name: 'Lomé', country: 'Togo', lat: 6.17, lng: 1.23 },
  { id: 'cotonou', name: 'Cotonou', country: 'Bénin', lat: 6.37, lng: 2.39 },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', lat: 6.52, lng: 3.38 },
  { id: 'ouagadougou', name: 'Ouagadougou', country: 'Burkina Faso', lat: 12.37, lng: -1.52 },
  { id: 'bamako', name: 'Bamako', country: 'Mali', lat: 12.64, lng: -8.0 },
  { id: 'conakry', name: 'Conakry', country: 'Guinée', lat: 9.64, lng: -13.58 },
  { id: 'douala', name: 'Douala', country: 'Cameroun', lat: 4.05, lng: 9.77 },
]

export const DEFAULT_CITY = CITIES[0]

// Rayon autour du centre-ville dans lequel un signalement appartient à la ville
export const CITY_RADIUS_KM = 50

// Distance entre deux points (formule de haversine), en kilomètres
export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

// Ville la plus proche d'une position, si elle est à moins de maxKm
export function nearestCity(lat, lng, maxKm = 100) {
  let best = null
  for (const city of CITIES) {
    const km = distanceKm({ lat, lng }, city)
    if (!best || km < best.km) best = { city, km }
  }
  return best && best.km <= maxKm ? best : null
}
