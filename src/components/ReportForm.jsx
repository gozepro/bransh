import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadReportImage } from '../lib/media'

// Coordonnées approximatives du centre de chaque commune
const COMMUNES = [
  { name: 'Plateau', lat: 5.3236, lng: -4.0166 },
  { name: 'Cocody', lat: 5.3599, lng: -3.9967 },
  { name: 'Yopougon', lat: 5.3367, lng: -4.0889 },
  { name: 'Marcory', lat: 5.3011, lng: -3.9798 },
  { name: 'Treichville', lat: 5.2933, lng: -4.009 },
  { name: 'Adjamé', lat: 5.356, lng: -4.027 },
  { name: 'Abobo', lat: 5.4167, lng: -4.0167 },
  { name: 'Koumassi', lat: 5.29, lng: -3.95 },
  { name: 'Port-Bouët', lat: 5.25, lng: -3.93 },
  { name: 'Attécoubé', lat: 5.33, lng: -4.04 },
  { name: 'Bingerville', lat: 5.355, lng: -3.89 },
]

export default function ReportForm({ user, onCreated, onClose }) {
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [communeIdx, setCommuneIdx] = useState(0)
  const [detail, setDetail] = useState('')
  const [coords, setCoords] = useState(null)
  const [witnessed, setWitnessed] = useState(true)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [focus, setFocus] = useState({ x: 50, y: 50 })
  const fileRef = useRef(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, label')
      .order('id')
      .then(({ data }) => setCategories(data || []))
  }, [])

  const locate = () => {
    setError(null)
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible sur cet appareil.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        // arrondi à ~100 m pour protéger la vie privée
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(3)),
          lng: Number(pos.coords.longitude.toFixed(3)),
        }),
      () => setError('Impossible d’obtenir ta position. Choisis une commune dans la liste.')
    )
  }

  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    if (preview) URL.revokeObjectURL(preview)
    setPhoto(file || null)
    setPreview(file ? URL.createObjectURL(file) : null)
    setFocus({ x: 50, y: 50 })
    e.target.value = ''
  }

  const removePhoto = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPhoto(null)
    setPreview(null)
  }

  const setFocusFromClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setFocus({
      x: Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100))),
      y: Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100))),
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!categoryId) {
      setError('Choisis une catégorie.')
      return
    }
    setBusy(true)

    const commune = COMMUNES[communeIdx]
    const point = coords || { lat: commune.lat, lng: commune.lng }
    const placeName = detail.trim() ? `${detail.trim()}, ${commune.name}` : commune.name

    const { data: created, error } = await supabase.from('reports').insert({
      author_id: user.id,
      category_id: categoryId,
      title: title.trim(),
      body: body.trim(),
      place_name: placeName,
      location: `SRID=4326;POINT(${point.lng} ${point.lat})`,
      witnessed,
    }).select('id').single()

    if (error) {
      setBusy(false)
      setError(error.message)
      return
    }

    if (photo) {
      try {
        await uploadReportImage({ file: photo, reportId: created.id, userId: user.id, kind: 'photo', focus })
      } catch (err) {
        window.alert(`Ton signalement est envoyé, mais la photo n’a pas pu être ajoutée : ${err.message}`)
      }
    }

    setBusy(false)
    onCreated()
  }

  return (
    <div className="card">
      <div className="row between">
        <h2>Votre info peut faire la différence.</h2>
        <button className="link" onClick={onClose} type="button">
          ✕
        </button>
      </div>
      <p className="muted">Un fait observé, une ville mieux informée. Racontez-nous.</p>

      <form onSubmit={submit}>
        <label>
          Un titre clair *
          <input
            required
            minLength={5}
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Que se passe-t-il ? (80 caractères maximum)"
          />
        </label>

        <label>
          Les faits, simplement *
          <textarea
            required
            minLength={20}
            maxLength={2000}
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={'Qui est concerné ? Que s’est-il passé ?\nQuand cela a-t-il eu lieu ?'}
          />
        </label>
        <p className="hint">Restez factuel et évitez de partager des données personnelles.</p>

        <p className="label">Quelle catégorie ? *</p>
        <div className="chips">
          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              className={categoryId === c.id ? 'chip active' : 'chip'}
              onClick={() => setCategoryId(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label>
          Où cela se passe-t-il ? *
          <select value={communeIdx} onChange={(e) => setCommuneIdx(Number(e.target.value))}>
            {COMMUNES.map((c, i) => (
              <option key={c.name} value={i}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Précision (quartier, rue, repère)
          <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Ex : Pont Félix-Houphouët-Boigny" />
        </label>
        <button type="button" className="secondary" onClick={locate}>
          {coords ? '📍 Position enregistrée (approximative)' : '📍 Ma position'}
        </button>

        <p className="label">
          Une image pour mieux comprendre <span className="hint">Facultatif</span>
        </p>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
        {preview ? (
          <>
            <div className="cropbox" onClick={setFocusFromClick} role="presentation">
              <img
                src={preview}
                alt="Aperçu de la photo"
                style={{ objectPosition: `${focus.x}% ${focus.y}%` }}
              />
            </div>
            <p className="hint">
              👆 Touche l'image pour choisir la partie à mettre en valeur : c'est ce cadrage qui s'affichera dans le fil.
            </p>
            <div className="row">
              <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
                Changer de photo
              </button>
              <button type="button" className="secondary" onClick={removePhoto}>
                Retirer
              </button>
            </div>
          </>
        ) : (
          <div
            className="dropzone"
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            <span className="up">⬆</span>
            <strong>Ajouter une photo</strong>
            <small>JPG, PNG ou WebP · compressée automatiquement</small>
          </div>
        )}
        <p className="hint">🔒 Confidentialité : les données GPS cachées dans la photo sont retirées avant l'envoi.</p>

        <p className="label">Comment avez-vous cette information ?</p>
        <div className="chips">
          <button
            type="button"
            className={witnessed ? 'chip active' : 'chip'}
            onClick={() => setWitnessed(true)}
          >
            J'étais sur place
          </button>
          <button
            type="button"
            className={!witnessed ? 'chip active' : 'chip'}
            onClick={() => setWitnessed(false)}
          >
            Je l'ai vue ailleurs
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <button className="primary" disabled={busy}>
          {busy ? 'Envoi…' : 'Soumettre mon signalement →'}
        </button>
        <p className="hint center">Votre contribution sera affichée comme « Non vérifiée ».</p>
      </form>
    </div>
  )
}
