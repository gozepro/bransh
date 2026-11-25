import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { SUPPORT } from '../config/support'
import { HELP_NOTE, HELP_WHATSAPP } from '../config/help'

const TOPICS = [
  { id: 'compte', label: 'Mon compte' },
  { id: 'signalement', label: 'Un signalement' },
  { id: 'bug', label: 'Un problème technique' },
  { id: 'suggestion', label: 'Une suggestion' },
  { id: 'autre', label: 'Autre chose' },
]

const FAQ = [
  {
    q: 'Que veut dire « Non vérifiée » ?',
    a: 'Personne n’a encore confirmé l’information. Les vérificateurs et la communauté peuvent la confirmer ou la contester ; son statut change au fil des vérifications.',
  },
  {
    q: 'Comment changer mon nom ou mon mot de passe ?',
    a: 'Va dans Profil → Paramètres → Gestion du compte.',
  },
  {
    q: 'Comment supprimer mon compte ?',
    a: 'Dans Profil → Paramètres → Gestion du compte, tout en bas. Ton compte, tes signalements, tes votes et tes photos sont alors supprimés.',
  },
  {
    q: 'Ma photo ne s’envoie pas',
    a: 'Utilise une photo JPG, PNG ou WebP de moins de 15 Mo et vérifie ta connexion. Elle est compressée automatiquement avant l’envoi.',
  },
]

export default function Help({ user, onBack }) {
  const [topic, setTopic] = useState('compte')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (message.trim().length < 10) {
      setError('Décris ton problème en au moins 10 caractères.')
      return
    }
    setBusy(true)
    const { error } = await supabase
      .from('help_requests')
      .insert({ user_id: user.id, topic, message: message.trim() })
    setBusy(false)
    if (error) {
      setError(
        /row-level security/i.test(error.message)
          ? 'Tu as déjà envoyé plusieurs demandes aujourd’hui. Réessaie demain ou écris-nous directement.'
          : error.message,
      )
    } else {
      setSent(true)
      setMessage('')
    }
  }

  const whatsappHref = HELP_WHATSAPP
    ? `https://wa.me/${HELP_WHATSAPP}?text=${encodeURIComponent('Bonjour, j’ai besoin d’aide sur Bransh.')}`
    : null

  return (
    <div>
      <div className="row between">
        <h2>Aide et contact</h2>
        <button className="link" onClick={onBack}>
          ✕
        </button>
      </div>
      <p className="muted">Une question, un problème, une idée ? Écris-nous, on t'aide.</p>

      {(whatsappHref || SUPPORT.contactEmail) && (
        <div className="help-contacts">
          {whatsappHref && (
            <a className="secondary linkbtn" href={whatsappHref} target="_blank" rel="noreferrer">
              💬 WhatsApp
            </a>
          )}
          {SUPPORT.contactEmail && (
            <a className="secondary linkbtn" href={`mailto:${SUPPORT.contactEmail}`}>
              ✉️ E-mail
            </a>
          )}
        </div>
      )}

      {user ? (
        sent ? (
          <div className="card">
            <p className="success">✓ Message envoyé. Merci !</p>
            <p className="muted">
              Nous te répondrons à l'adresse de ton compte ({user.email}).{HELP_NOTE ? ` ${HELP_NOTE}` : ''}
            </p>
            <button className="secondary" onClick={() => setSent(false)}>
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form className="card" onSubmit={submit}>
            <h3 className="flush">Envoyer un message</h3>
            <label>
              Ça concerne…
              <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                {TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ton message
              <textarea
                rows={5}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explique ce qui se passe, avec le plus de détails possible."
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary" disabled={busy}>
              {busy ? 'Envoi…' : 'Envoyer'}
            </button>
            {HELP_NOTE && <p className="hint">{HELP_NOTE}</p>}
          </form>
        )
      ) : (
        <p className="notice">Connecte-toi pour nous écrire depuis l'application.</p>
      )}

      <h3>Questions fréquentes</h3>
      <div className="faq">
        {FAQ.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
