import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { STATUS, timeAgo } from '../lib/format'

const ROLES = { citizen: 'Citoyen', verifier: 'Vérificateur', moderator: 'Modérateur', admin: 'Administrateur' }
const STAFF = ['verifier', 'moderator', 'admin']

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

const PinIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l3 3 5-6" />
  </svg>
)

const GearIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)

export default function Profile({ user, onOpenReport, onSupport, onSettings, onLogout }) {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ reports: 0, votes: 0 })
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: p } = await supabase
        .from('profiles')
        .select('display_name, trust_score, role, created_at')
        .eq('id', user.id)
        .maybeSingle()
      const [r, v] = await Promise.all([
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
        supabase.from('report_votes').select('report_id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      let pending = []
      if (p && STAFF.includes(p.role)) {
        const { data } = await supabase
          .from('reports_feed')
          .select('id, title, place_name, status, created_at, importance')
          .in('status', ['non_verifiee', 'en_verification'])
          .order('created_at', { ascending: true })
          .limit(10)
        pending = data || []
      }
      if (cancelled) return
      setProfile(p)
      setStats({ reports: r.count || 0, votes: v.count || 0 })
      setQueue(pending)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user.id])

  if (loading) return <p className="muted">Chargement du profil…</p>

  const role = profile?.role || 'citizen'
  const isStaff = STAFF.includes(role)
  const isAdmin = role === 'admin'
  const displayName = profile?.display_name || 'Citoyen'
  const trust = Math.max(0, Math.min(100, profile?.trust_score ?? 50))

  return (
    <div>
      <div className="card profile-head">
        <div className="avatar" aria-hidden="true">
          {initials(displayName)}
        </div>
        <h2>{displayName}</h2>
        <p className="muted">{user.email}</p>
        <div className="row">
          <span className={role === 'citizen' ? 'badge' : 'badge green'}>{ROLES[role]}</span>
          <button className="link small" onClick={() => onSettings('account')}>
            Modifier
          </button>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card stat-trust">
          <div className="ring">
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle className="ring-bg" cx="18" cy="18" r="15" />
              <circle
                className="ring-fg"
                cx="18"
                cy="18"
                r="15"
                pathLength="100"
                strokeDasharray={`${trust} 100`}
                transform="rotate(-90 18 18)"
              />
            </svg>
            <strong>{trust}</strong>
          </div>
          <span className="stat-label">Indice de confiance</span>
        </div>

        <div className="stat-card stat-reports">
          <div className="stat-icon">
            <PinIcon />
          </div>
          <strong className="stat-num">{stats.reports}</strong>
          <span className="stat-label">Signalement{stats.reports > 1 ? 's' : ''}</span>
        </div>

        <div className="stat-card stat-votes">
          <div className="stat-icon">
            <CheckIcon />
          </div>
          <strong className="stat-num">{stats.votes}</strong>
          <span className="stat-label">Vote{stats.votes > 1 ? 's' : ''}</span>
        </div>
      </div>

      {isStaff && (
        <div className="card">
          <h3 className="flush">
            À vérifier ({queue.length}
            {queue.length === 10 ? '+' : ''})
          </h3>
          {queue.length === 0 ? (
            <p className="muted">Rien en attente : tout est à jour. 🎉</p>
          ) : (
            queue.map((r) => {
              const [label, tone] = STATUS[r.status] || ['—', 'grey']
              return (
                <button className="queue-item" key={r.id} onClick={() => onOpenReport(r.id)}>
                  <span className="queue-title">{r.title}</span>
                  <span className="row between meta">
                    <span>
                      {r.place_name} · {timeAgo(r.created_at)}
                    </span>
                    <span className={`badge ${tone}`}>{label}</span>
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}

      <button className="card support-link" onClick={() => onSettings()}>
        <span className="row">
          <span className="row-icon">
            <GearIcon />
          </span>
          <span>
            <strong>Paramètres</strong>
            {isAdmin && <span className="muted"> · thème, notifications, compte, confidentialité, avis</span>}
          </span>
        </span>
        <span aria-hidden="true">→</span>
      </button>

      <button className="card support-link" onClick={onSupport}>
        <span>
          <strong>❤ Soutenir Bransh</strong>
          {isAdmin && <span className="muted"> · dons et autres façons d'aider</span>}
        </span>
        <span aria-hidden="true">→</span>
      </button>

      <button className="secondary full" onClick={onLogout}>
        Se déconnecter
      </button>
    </div>
  )
}
