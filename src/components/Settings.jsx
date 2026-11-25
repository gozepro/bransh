import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CITIES } from '../lib/cities'
import { SUPPORT } from '../config/support'
import { APP_VERSION } from '../config/app'
import Privacy from './Privacy'

const THEMES = [
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
  { id: 'auto', label: 'Automatique' },
]

const BUCKET = 'report-media'

function SectionHeader({ title, onBack }) {
  return (
    <div className="row between">
      <button className="link" onClick={onBack}>
        ← Paramètres
      </button>
      <h2>{title}</h2>
    </div>
  )
}

function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className="toggle-row">
      <span className="toggle-text">
        <strong>{label}</strong>
        {hint && <span className="muted">{hint}</span>}
      </span>
      <span className="switch">
        <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="track" />
      </span>
    </label>
  )
}

/* ---------------- Gestion du compte ---------------- */
function AccountSection({ user, role, onBack, onDeleted }) {
  const [name, setName] = useState('')
  const [currentName, setCurrentName] = useState('')
  const [nameMsg, setNameMsg] = useState(null)
  const [nameBusy, setNameBusy] = useState(false)

  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [pwdMsg, setPwdMsg] = useState(null)
  const [pwdBusy, setPwdBusy] = useState(false)

  const [confirm, setConfirm] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [delError, setDelError] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setName(data?.display_name || '')
        setCurrentName(data?.display_name || '')
      })
  }, [user.id])

  const saveName = async (e) => {
    e.preventDefault()
    const clean = name.trim()
    setNameMsg(null)
    if (clean.length < 2 || clean.length > 40) {
      setNameMsg({ type: 'error', text: 'Le nom doit faire entre 2 et 40 caractères.' })
      return
    }
    setNameBusy(true)
    const { error } = await supabase.from('profiles').update({ display_name: clean }).eq('id', user.id)
    setNameBusy(false)
    if (error) setNameMsg({ type: 'error', text: error.message })
    else {
      setCurrentName(clean)
      setNameMsg({ type: 'ok', text: '✓ Nom mis à jour. Il apparaît sur tes signalements.' })
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setPwdMsg(null)
    if (pwd.length < 8) {
      setPwdMsg({ type: 'error', text: 'Le mot de passe doit faire au moins 8 caractères.' })
      return
    }
    if (pwd !== pwd2) {
      setPwdMsg({ type: 'error', text: 'Les deux mots de passe ne sont pas identiques.' })
      return
    }
    setPwdBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    setPwdBusy(false)
    if (error) {
      const needsLogin = /reauth|recent|nonce/i.test(error.message)
      setPwdMsg({
        type: 'error',
        text: needsLogin
          ? 'Pour ta sécurité, déconnecte-toi puis reconnecte-toi avant de changer ton mot de passe.'
          : error.message,
      })
    } else {
      setPwd('')
      setPwd2('')
      setPwdMsg({ type: 'ok', text: '✓ Mot de passe modifié.' })
    }
  }

  const deleteAccount = async () => {
    setDelBusy(true)
    setDelError(null)
    try {
      // 1. Supprime les images envoyées par cette personne
      const { data: files } = await supabase.storage.from(BUCKET).list(user.id, { limit: 1000 })
      if (files && files.length > 0) {
        await supabase.storage.from(BUCKET).remove(files.map((f) => `${user.id}/${f.name}`))
      }
      // 2. Supprime le compte et toutes ses données
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw error
      await onDeleted()
    } catch (err) {
      setDelError(err.message || 'Impossible de supprimer le compte.')
      setDelBusy(false)
    }
  }

  const canDelete = role !== 'admin' && role !== 'moderator'

  return (
    <div>
      <SectionHeader title="Gestion du compte" onBack={onBack} />

      <div className="card">
        <p className="muted">Adresse e-mail</p>
        <strong>{user.email}</strong>
      </div>

      <form className="card" onSubmit={saveName}>
        <h3 className="flush">Nom affiché</h3>
        <label>
          Mon nom
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </label>
        {nameMsg && <p className={nameMsg.type === 'ok' ? 'success' : 'error'}>{nameMsg.text}</p>}
        <button className="primary" disabled={nameBusy || name.trim() === currentName}>
          {nameBusy ? '…' : 'Enregistrer le nom'}
        </button>
      </form>

      <form className="card" onSubmit={savePassword}>
        <h3 className="flush">Mot de passe</h3>
        <label>
          Nouveau mot de passe
          <input type="password" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </label>
        <label>
          Confirmer le mot de passe
          <input type="password" autoComplete="new-password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
        </label>
        {pwdMsg && <p className={pwdMsg.type === 'ok' ? 'success' : 'error'}>{pwdMsg.text}</p>}
        <button className="primary" disabled={pwdBusy || !pwd}>
          {pwdBusy ? '…' : 'Changer le mot de passe'}
        </button>
      </form>

      <div className="card danger">
        <h3 className="flush">Supprimer mon compte</h3>
        {canDelete ? (
          <>
            <p className="muted">
              Cette action est <strong>définitive</strong> : ton compte, tes signalements, tes votes, tes photos et tes
              avis seront supprimés.
            </p>
            <label>
              Pour confirmer, écris <strong>SUPPRIMER</strong>
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="characters" />
            </label>
            {delError && <p className="error">{delError}</p>}
            <button className="primary danger-btn" disabled={confirm !== 'SUPPRIMER' || delBusy} onClick={deleteAccount}>
              {delBusy ? 'Suppression…' : 'Supprimer définitivement mon compte'}
            </button>
          </>
        ) : (
          <p className="muted">
            Les comptes administrateurs et modérateurs ne peuvent pas être supprimés depuis l'application. Contacte le
            responsable du projet.
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------------- Notifications ---------------- */
function NotificationsSection({ user, onBack }) {
  const [prefs, setPrefs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('notif_critical, notif_my_reports, notif_nearby, notif_news')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setPrefs(data)
      })
  }, [user.id])

  const update = async (key, value) => {
    const previous = prefs
    setPrefs({ ...prefs, [key]: value })
    setError(null)
    const { error } = await supabase.from('profiles').update({ [key]: value }).eq('id', user.id)
    if (error) {
      setPrefs(previous)
      setError(error.message)
    }
  }

  return (
    <div>
      <SectionHeader title="Notifications" onBack={onBack} />
      <p className="notice">
        Les notifications ne sont pas encore actives. Tes choix sont déjà enregistrés et seront pris en compte dès leur
        lancement.
      </p>
      {error && <p className="error">{error}</p>}
      {!prefs && !error && <p className="muted">Chargement…</p>}
      {prefs && (
        <div className="card">
          <Toggle
            label="Alertes critiques près de moi"
            hint="Urgences et situations importantes dans ta ville."
            checked={prefs.notif_critical}
            onChange={(v) => update('notif_critical', v)}
          />
          <Toggle
            label="Mises à jour de mes signalements"
            hint="Quand un signalement est vérifié, confirmé ou contesté."
            checked={prefs.notif_my_reports}
            onChange={(v) => update('notif_my_reports', v)}
          />
          <Toggle
            label="Infos confirmées près de moi"
            hint="Un résumé des informations vérifiées dans ta ville."
            checked={prefs.notif_nearby}
            onChange={(v) => update('notif_nearby', v)}
          />
          <Toggle
            label="Nouveautés de Bransh"
            hint="Les nouvelles fonctionnalités et les appels à bénévoles."
            checked={prefs.notif_news}
            onChange={(v) => update('notif_news', v)}
          />
        </div>
      )}
    </div>
  )
}

/* ---------------- Note et avis ---------------- */
function FeedbackSection({ user, role, onBack }) {
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [list, setList] = useState([])
  const canRead = role === 'admin' || role === 'moderator'

  const loadList = () => {
    if (!canRead) return
    supabase
      .from('feedback')
      .select('id, rating, message, created_at, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setList(data || []))
  }

  useEffect(loadList, [canRead])

  const submit = async (e) => {
    e.preventDefault()
    setMsg(null)
    if (rating === 0) {
      setMsg({ type: 'error', text: 'Choisis une note de 1 à 5 étoiles.' })
      return
    }
    setBusy(true)
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      rating,
      message: message.trim() || null,
    })
    setBusy(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else {
      setRating(0)
      setMessage('')
      setMsg({ type: 'ok', text: '✓ Merci pour ton avis, il nous aide à améliorer Bransh !' })
      loadList()
    }
  }

  return (
    <div>
      <SectionHeader title="Note et avis" onBack={onBack} />
      <form className="card" onSubmit={submit}>
        <h3 className="flush">Que penses-tu de Bransh ?</h3>
        <div className="stars" role="radiogroup" aria-label="Note de 1 à 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              className={n <= rating ? 'star on' : 'star'}
              onClick={() => setRating(n)}
              aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
              aria-pressed={n === rating}
            >
              ★
            </button>
          ))}
        </div>
        <label>
          Ton commentaire (facultatif)
          <textarea rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ce qui te plaît, ce qui te manque, un bug rencontré…" />
        </label>
        {msg && <p className={msg.type === 'ok' ? 'success' : 'error'}>{msg.text}</p>}
        <button className="primary" disabled={busy}>
          {busy ? 'Envoi…' : 'Envoyer mon avis'}
        </button>
      </form>

      {canRead && (
        <div className="card">
          <h3 className="flush">Avis reçus ({list.length})</h3>
          {list.length === 0 && <p className="muted">Aucun avis pour l'instant.</p>}
          {list.map((f) => (
            <div className="feedback-item" key={f.id}>
              <div className="row between">
                <span className="stars-static">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                <span className="muted">{new Date(f.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              {f.message && <p>{f.message}</p>}
              <span className="muted">{f.profiles?.display_name || 'Anonyme'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- À propos ---------------- */
function AboutSection({ onBack, onSupport, onPrivacy }) {
  return (
    <div>
      <SectionHeader title="À propos" onBack={onBack} />
      <div className="card">
        <div className="logo">
          bransh<span>.</span>
        </div>
        <p className="muted">{APP_VERSION}</p>
        <p>L'information au plus près de vous, vérifiée ensemble.</p>
      </div>
      <div className="card">
        <p>
          Bransh est un projet <strong>open source</strong> : tout le monde peut lire le code, signaler un problème ou
          proposer une amélioration.
        </p>
        <p>
          <a href={SUPPORT.repoUrl} target="_blank" rel="noreferrer">
            Voir le projet sur GitHub
          </a>
        </p>
        {SUPPORT.contactEmail && (
          <p>
            <a href={`mailto:${SUPPORT.contactEmail}`}>{SUPPORT.contactEmail}</a>
          </p>
        )}
      </div>
      <button className="card support-link" onClick={onSupport}>
        <span>
          <strong>❤ Soutenir Bransh</strong>
        </span>
        <span aria-hidden="true">→</span>
      </button>
      <button className="card support-link" onClick={onPrivacy}>
        <span>
          <strong>Politique de confidentialité</strong>
        </span>
        <span aria-hidden="true">→</span>
      </button>
    </div>
  )
}

/* ---------------- Apparence ---------------- */
function AppearanceSection({ themePref, setThemePref, onBack }) {
  return (
    <div>
      <SectionHeader title="Apparence" onBack={onBack} />
      <div className="card">
        <div className="seg" role="radiogroup" aria-label="Thème">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={themePref === t.id}
              className={themePref === t.id ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setThemePref(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="hint">« Automatique » suit le réglage de ton téléphone ou de ton ordinateur.</p>
      </div>
    </div>
  )
}

/* ---------------- Ville ---------------- */
function CitySection({ city, choose, locate, detecting, onBack }) {
  return (
    <div>
      <SectionHeader title="Ville" onBack={onBack} />
      <div className="card">
        <div className="citybar">
          <label className="citypick">
            <span aria-hidden="true">📍</span>
            <select value={city.id} onChange={(e) => choose(e.target.value)} aria-label="Choisir ta ville">
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button className="link small" onClick={locate} disabled={detecting}>
            {detecting ? 'Localisation…' : 'Utiliser ma position'}
          </button>
        </div>
        <p className="hint">Ta position est utilisée uniquement sur ton appareil pour trouver la ville la plus proche.</p>
      </div>
    </div>
  )
}

/* ---------------- Équipe et rôles (administrateurs) ---------------- */
const ROLE_LABELS = { citizen: 'Citoyen', verifier: 'Vérificateur', moderator: 'Modérateur', admin: 'Administrateur' }

function TeamSection({ user, onBack }) {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [chosen, setChosen] = useState({})
  const [log, setLog] = useState([])
  const [msg, setMsg] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [loading, setLoading] = useState(true)

  const search = useCallback(async (q) => {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_search_users', { p_query: q.trim() })
    if (error) setMsg({ type: 'error', text: error.message })
    else setUsers(data || [])
    setLoading(false)
  }, [])

  const loadLog = useCallback(async () => {
    const { data } = await supabase
      .from('role_changes')
      .select(
        'id, old_role, new_role, changed_at, target:profiles!role_changes_target_id_fkey(display_name), actor:profiles!role_changes_changed_by_fkey(display_name)',
      )
      .order('changed_at', { ascending: false })
      .limit(10)
    setLog(data || [])
  }, [])

  useEffect(() => {
    search('')
    loadLog()
  }, [search, loadLog])

  const save = async (u) => {
    const role = chosen[u.id] || u.role
    if (role === u.role) return
    if (
      role === 'admin' &&
      !window.confirm(`Nommer ${u.display_name} administrateur ? Cette personne pourra gérer les rôles et lire les messages d'aide.`)
    )
      return
    setBusyId(u.id)
    setMsg(null)
    const { error } = await supabase.rpc('set_user_role', { p_user: u.id, p_role: role })
    setBusyId(null)
    if (error) setMsg({ type: 'error', text: error.message })
    else {
      setMsg({ type: 'ok', text: `✓ ${u.display_name} est maintenant ${ROLE_LABELS[role].toLowerCase()}.` })
      setChosen((c) => ({ ...c, [u.id]: undefined }))
      search(query)
      loadLog()
    }
  }

  return (
    <div>
      <SectionHeader title="Équipe et rôles" onBack={onBack} />
      <p className="muted">
        Cherche une personne (nom ou adresse e-mail) pour lui donner un rôle. Elle doit déjà avoir créé un compte.
      </p>

      <form
        className="search-row"
        onSubmit={(e) => {
          e.preventDefault()
          search(query)
        }}
      >
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom ou e-mail" />
        <button className="secondary">Chercher</button>
      </form>

      {msg && <p className={msg.type === 'ok' ? 'success' : 'error'}>{msg.text}</p>}

      <div className="card">
        {loading && <p className="muted">Chargement…</p>}
        {!loading && users.length === 0 && <p className="muted">Aucun résultat.</p>}
        {users.map((u) => {
          const me = u.id === user.id
          const value = chosen[u.id] || u.role
          return (
            <div className="user-row" key={u.id}>
              <div>
                <strong>{u.display_name}</strong>
                {me && <span className="muted"> (toi)</span>}
                <div className="muted">{u.email_hint}</div>
              </div>
              {me ? (
                <span className="badge green">{ROLE_LABELS[u.role]}</span>
              ) : (
                <div className="user-actions">
                  <select
                    value={value}
                    onChange={(e) => setChosen((c) => ({ ...c, [u.id]: e.target.value }))}
                    aria-label={`Rôle de ${u.display_name}`}
                  >
                    {Object.entries(ROLE_LABELS).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button className="secondary" disabled={busyId === u.id || value === u.role} onClick={() => save(u)}>
                    OK
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card">
        <h3 className="flush">Derniers changements de rôle</h3>
        {log.length === 0 && <p className="muted">Aucun changement pour l'instant.</p>}
        {log.map((l) => (
          <div className="feedback-item" key={l.id}>
            <strong>{l.target?.display_name || 'Compte supprimé'}</strong> : {ROLE_LABELS[l.old_role]} →{' '}
            {ROLE_LABELS[l.new_role]}
            <div className="muted">
              par {l.actor?.display_name || '—'} · {new Date(l.changed_at).toLocaleString('fr-FR')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Messages d'aide (administrateurs) ---------------- */
const TOPIC_LABELS = {
  compte: 'Mon compte',
  signalement: 'Un signalement',
  bug: 'Problème technique',
  suggestion: 'Suggestion',
  autre: 'Autre',
}

function InboxSection({ onBack }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_help_requests')
    if (error) setError(error.message)
    else setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (id, status) => {
    setError(null)
    const { error } = await supabase.rpc('admin_set_help_status', { p_id: id, p_status: status })
    if (error) setError(error.message)
    else load()
  }

  const open = items.filter((i) => i.status === 'ouvert').length

  return (
    <div>
      <SectionHeader title="Messages d'aide" onBack={onBack} />
      <p className="muted">
        {open} message{open > 1 ? 's' : ''} en attente. Réponds par e-mail à l'adresse indiquée, puis marque-le comme
        traité.
      </p>
      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Chargement…</p>}
      {!loading && items.length === 0 && <p className="notice">Aucun message pour l'instant.</p>}
      {items.map((i) => (
        <div className="card" key={i.id}>
          <div className="row between">
            <span className="badge">{TOPIC_LABELS[i.topic] || i.topic}</span>
            <span className={i.status === 'ouvert' ? 'badge amber' : 'badge green'}>
              {i.status === 'ouvert' ? 'À traiter' : 'Traité'}
            </span>
          </div>
          <p className="inbox-msg">{i.message}</p>
          <p className="muted">
            {i.author_name} ·{' '}
            <a href={`mailto:${i.author_email}?subject=${encodeURIComponent('Ta demande sur Bransh')}`}>
              {i.author_email}
            </a>{' '}
            · {new Date(i.created_at).toLocaleString('fr-FR')}
          </p>
          <button className="secondary" onClick={() => setStatus(i.id, i.status === 'ouvert' ? 'traite' : 'ouvert')}>
            {i.status === 'ouvert' ? 'Marquer comme traité' : 'Rouvrir'}
          </button>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Écran principal ---------------- */
function Row({ title, hint, showHint, onClick }) {
  return (
    <button className="card support-link" onClick={onClick}>
      <span>
        <strong>{title}</strong>
        {showHint && hint && <span className="muted"> · {hint}</span>}
      </span>
      <span aria-hidden="true">→</span>
    </button>
  )
}

export default function Settings({
  user,
  role,
  themePref,
  setThemePref,
  city,
  choose,
  locate,
  detecting,
  onSupport,
  onHelp,
  onBack,
  onLogout,
  initialSection = null,
}) {
  const [section, setSection] = useState(initialSection)
  const isAdmin = role === 'admin'

  const backFromSection = () => (initialSection ? onBack() : setSection(null))

  if (section === 'appearance')
    return <AppearanceSection themePref={themePref} setThemePref={setThemePref} onBack={backFromSection} />
  if (section === 'city')
    return <CitySection city={city} choose={choose} locate={locate} detecting={detecting} onBack={backFromSection} />
  if (section === 'account' && user)
    return <AccountSection user={user} role={role} onBack={backFromSection} onDeleted={onLogout} />
  if (section === 'notifications' && user) return <NotificationsSection user={user} onBack={backFromSection} />
  if (section === 'feedback' && user) return <FeedbackSection user={user} role={role} onBack={backFromSection} />
  if (section === 'team' && user && isAdmin) return <TeamSection user={user} onBack={backFromSection} />
  if (section === 'inbox' && user && isAdmin) return <InboxSection onBack={backFromSection} />
  if (section === 'about')
    return <AboutSection onBack={backFromSection} onSupport={onSupport} onPrivacy={() => setSection('privacy')} />
  if (section === 'privacy')
    return (
      <div>
        <SectionHeader title="Confidentialité" onBack={backFromSection} />
        <Privacy />
      </div>
    )

  // Les détails sous chaque rubrique ne sont visibles que par les administrateurs
  const hint = isAdmin

  return (
    <div>
      <div className="row between">
        <h2>Paramètres</h2>
        <button className="link" onClick={onBack}>
          ✕
        </button>
      </div>

      <Row title="Apparence" hint="clair, sombre ou automatique" showHint={hint} onClick={() => setSection('appearance')} />
      <Row title="Ville" hint="ta ville et ta position" showHint={hint} onClick={() => setSection('city')} />

      {user && (
        <>
          <Row
            title="Gestion du compte"
            hint="nom, mot de passe, suppression"
            showHint={hint}
            onClick={() => setSection('account')}
          />
          <Row
            title="Notifications"
            hint="alertes et mises à jour"
            showHint={hint}
            onClick={() => setSection('notifications')}
          />
        </>
      )}

      <Row title="Confidentialité" hint="tes données et tes droits" showHint={hint} onClick={() => setSection('privacy')} />

      {user && (
        <Row title="Note et avis" hint="donne ton avis sur Bransh" showHint={hint} onClick={() => setSection('feedback')} />
      )}

      <Row title="Aide et contact" hint="écrire à l'équipe, questions fréquentes" showHint={hint} onClick={onHelp} />
      <Row title="À propos" hint="version, projet, contact" showHint={hint} onClick={() => setSection('about')} />

      {user && isAdmin && (
        <>
          <h3>Administration</h3>
          <Row
            title="Équipe et rôles"
            hint="nommer des vérificateurs, modérateurs et administrateurs"
            showHint={hint}
            onClick={() => setSection('team')}
          />
          <Row title="Messages d'aide" hint="demandes des utilisateurs" showHint={hint} onClick={() => setSection('inbox')} />
        </>
      )}

      {user && (
        <button className="secondary full" onClick={onLogout}>
          Se déconnecter
        </button>
      )}
    </div>
  )
}
