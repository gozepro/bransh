import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { publicUrl, uploadReportImage } from '../lib/media'
import { STATUS, IMPORTANCE, timeAgo, formatDate } from '../lib/format'

const STAFF = ['verifier', 'moderator', 'admin']

export default function ReportDetail({ id, userId, role, onBack, onNeedAuth }) {
  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [media, setMedia] = useState([])
  const [myVote, setMyVote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [newStatus, setNewStatus] = useState('non_verifiee')
  const [newImportance, setNewImportance] = useState('modere')
  const [reason, setReason] = useState('')
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('reports_feed').select('*').eq('id', id).maybeSingle()
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (!data) {
      setError('Signalement introuvable.')
      setLoading(false)
      return
    }
    setReport(data)
    setNewStatus(data.status)
    setNewImportance(data.importance)

    const { data: h } = await supabase
      .from('status_history')
      .select('*')
      .eq('report_id', id)
      .order('changed_at', { ascending: false })
    setHistory(h || [])

    const { data: m } = await supabase
      .from('report_media')
      .select('id, storage_path, kind, created_at, focus_x, focus_y')
      .eq('report_id', id)
      .order('created_at')
    setMedia(m || [])

    if (userId) {
      const { data: v } = await supabase
        .from('report_votes')
        .select('kind')
        .eq('report_id', id)
        .eq('user_id', userId)
        .maybeSingle()
      setMyVote(v ? v.kind : null)
    }
    setLoading(false)
  }, [id, userId])

  useEffect(() => {
    load()
  }, [load])

  // Message de confirmation qui disparaît tout seul
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  const flash = (type, text) => setToast({ type, text })

  const vote = async (kind) => {
    if (!userId) {
      onNeedAuth()
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('vote_report', { p_report: id, p_kind: kind })
    setBusy(false)
    if (error) setError(error.message)
    else {
      flash('ok', kind === 'confirm' ? '✓ Merci ! Ta confirmation est enregistrée.' : '✓ Merci ! Ta contestation est enregistrée.')
      load()
    }
  }

  const addEvidence = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!userId) {
      onNeedAuth()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await uploadReportImage({ file, reportId: id, userId, kind: 'evidence' })
      await load()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  const review = async (e) => {
    e.preventDefault()
    setError(null)
    if (newStatus === report.status && newImportance === report.importance) {
      flash('error', 'Aucun changement : choisis un autre statut ou une autre importance avant d’enregistrer.')
      return
    }
    setBusy(true)
    const { error } = await supabase.rpc('review_report', {
      p_report: id,
      p_status: newStatus,
      p_importance: newImportance,
      p_reason: reason,
    })
    setBusy(false)
    if (error) flash('error', error.message)
    else {
      setReason('')
      flash('ok', `✓ Vérification enregistrée : le statut est maintenant « ${STATUS[newStatus][0]} ».`)
      load()
    }
  }

  const hide = async () => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('set_report_hidden', { p_report: id, p_hidden: !report.hidden })
    setBusy(false)
    if (error) flash('error', error.message)
    else {
      flash('ok', report.hidden ? '✓ Signalement réaffiché.' : '✓ Signalement masqué.')
      load()
    }
  }

  if (loading) return <p className="muted">Chargement…</p>

  if (!report)
    return (
      <div className="card">
        <p className="error">{error || 'Signalement introuvable.'}</p>
        <button className="link" onClick={onBack}>
          ← Retour
        </button>
      </div>
    )

  const [statusLabel, tone] = STATUS[report.status] || ['—', 'grey']
  const shareUrl = `${window.location.origin}/#r-${id}`
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${report.title} — ${shareUrl}`)}`
  const isStaff = STAFF.includes(role)
  const isModerator = role === 'moderator' || role === 'admin'

  return (
    <div>
      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}
      <div className="row between">
        <h2>Au cœur de l'information</h2>
        <button className="link" onClick={onBack}>
          ✕
        </button>
      </div>

      <p className="eyebrow">
        {report.category_label} · {report.place_name}
      </p>
      <h1 className="detail-title">{report.title}</h1>

      <div className={`statusbox ${tone}`}>
        <strong>{statusLabel}</strong>
        <span className="muted">
          Importance : {IMPORTANCE[report.importance]} · Mise à jour {timeAgo(report.updated_at)}
        </span>
      </div>

      {history[0] && (
        <p className="lastreview">
          🛡 Dernière vérification · {formatDate(history[0].changed_at)}
          <br />
          <span className="muted">{history[0].reason}</span>
        </p>
      )}

      <details className="history">
        <summary>Historique de vérification ({history.length})</summary>
        {history.length === 0 && <p className="muted">Aucune vérification pour l'instant.</p>}
        {history.map((h) => (
          <div className="hist-item" key={h.id}>
            <strong>{STATUS[h.new_status]?.[0]}</strong> · {formatDate(h.changed_at)}
            <div className="muted">{h.reason}</div>
          </div>
        ))}
      </details>

      <h3>Les faits essentiels</h3>
      <dl className="facts">
        <div>
          <dt>Qui</dt>
          <dd>
            {report.author_name} · {report.witnessed ? 'témoin citoyen' : 'info relayée'}
          </dd>
        </div>
        <div>
          <dt>Quand</dt>
          <dd>{formatDate(report.occurred_at)}</dd>
        </div>
        <div className="wide">
          <dt>Quoi</dt>
          <dd>{report.body}</dd>
        </div>
        <div className="wide">
          <dt>Où</dt>
          <dd>{report.place_name}</dd>
        </div>
      </dl>

      <h3>Éléments à l'appui</h3>
      {media.length === 0 ? (
        <p className="notice">Aucune pièce justificative jointe pour l'instant.</p>
      ) : (
        <div className="gallery">
          {media.map((m) => (
            <a key={m.id} href={publicUrl(m.storage_path)} target="_blank" rel="noreferrer">
              <img
                src={publicUrl(m.storage_path)}
                alt={m.kind === 'evidence' ? 'Preuve ajoutée' : 'Photo du signalement'}
                loading="lazy"
                style={{ objectPosition: `${m.focus_x}% ${m.focus_y}%` }}
              />
              <span>{m.kind === 'evidence' ? 'Preuve' : 'Photo'}</span>
            </a>
          ))}
        </div>
      )}

      <h3>Vous avez des informations ?</h3>
      <p className="muted">Votre regard peut aider la communauté.</p>
      <div className="votes">
        <button className={myVote === 'confirm' ? 'vote active' : 'vote'} disabled={busy} onClick={() => vote('confirm')}>
          ✓ Je confirme ({report.confirmations})
        </button>
        <button className={myVote === 'contest' ? 'vote active contest' : 'vote'} disabled={busy} onClick={() => vote('contest')}>
          ✕ Je conteste ({report.contestations})
        </button>
        <label className="vote file-vote">
          + Ajouter une preuve
          <input type="file" accept="image/*" hidden disabled={busy} onChange={addEvidence} />
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <a className="share" href={waHref} target="_blank" rel="noreferrer">
        Partager sur WhatsApp
      </a>

      {isStaff && (
        <form className="card staff" onSubmit={review}>
          <h3>Espace vérificateur</h3>
          <label>
            Statut
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {Object.entries(STATUS).map(([value, [label]]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Importance
            <select value={newImportance} onChange={(e) => setNewImportance(e.target.value)}>
              {Object.entries(IMPORTANCE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Justification (obligatoire)
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Sur quoi te bases-tu ? (source, appel, témoin, document…)"
            />
          </label>
          <button
            className="primary"
            disabled={busy || (newStatus === report.status && newImportance === report.importance)}
          >
            Enregistrer la vérification
          </button>
          <p className="hint">Change le statut ou l'importance pour pouvoir enregistrer.</p>
          {isModerator && (
            <button type="button" className="secondary" disabled={busy} onClick={hide}>
              {report.hidden ? 'Réafficher ce signalement' : 'Masquer ce signalement'}
            </button>
          )}
        </form>
      )}
    </div>
  )
}
