import { useState } from 'react'
import { SUPPORT } from '../config/support'

function formatAmount(n) {
  return new Intl.NumberFormat('fr-FR').format(n)
}

export default function Support({ onBack }) {
  const [copied, setCopied] = useState(null)
  const { goal, methods, repoUrl, contactEmail, intro } = SUPPORT

  const copy = async (id, value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(id)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      window.prompt('Copie ce numéro :', value)
    }
  }

  const percent = goal && goal.target > 0 ? Math.min(100, Math.round((goal.raised / goal.target) * 100)) : 0

  return (
    <div>
      <div className="row between">
        <h2>Soutenir Bransh</h2>
        <button className="link" onClick={onBack}>
          ✕
        </button>
      </div>
      <p className="muted">{intro}</p>

      {goal && (
        <div className="card">
          <strong>{goal.label}</strong>
          <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${percent}%` }} />
          </div>
          <p className="muted">
            {formatAmount(goal.raised)} / {formatAmount(goal.target)} {goal.currency} · {percent} %
          </p>
        </div>
      )}

      <h3>Faire un don</h3>
      {methods.length === 0 ? (
        <p className="notice">
          Les moyens de don arrivent bientôt. En attendant, tu peux aider autrement (voir plus bas) : chaque coup de
          main compte.
        </p>
      ) : (
        methods.map((m) => (
          <div className="card method" key={m.id}>
            <div>
              <strong>{m.label}</strong>
              {m.kind === 'number' && <div className="method-value">{m.value}</div>}
              {m.note && <div className="muted">{m.note}</div>}
            </div>
            {m.kind === 'number' ? (
              <button className="secondary" onClick={() => copy(m.id, m.value)}>
                {copied === m.id ? '✓ Copié' : 'Copier'}
              </button>
            ) : (
              <a className="secondary linkbtn" href={m.value} target="_blank" rel="noreferrer">
                Ouvrir
              </a>
            )}
          </div>
        ))
      )}

      <h3>Autres façons d'aider</h3>
      <ul className="help-list">
        <li>
          <strong>Parle de Bransh autour de toi</strong>
          <span className="muted"> : partage un signalement ou le lien de l'application.</span>
        </li>
        <li>
          <strong>Deviens vérificateur</strong>
          <span className="muted">
            {' '}
            : aide à confirmer ou démentir les informations de ton quartier.
            {contactEmail && (
              <>
                {' '}
                <a href={`mailto:${contactEmail}`}>Écris-nous</a>.
              </>
            )}
          </span>
        </li>
        <li>
          <strong>Contribue au code</strong>
          <span className="muted">
            {' '}
            : Bransh est open source.{' '}
            <a href={repoUrl} target="_blank" rel="noreferrer">
              Voir le projet sur GitHub
            </a>
            .
          </span>
        </li>
      </ul>
    </div>
  )
}
