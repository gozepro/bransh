import { SUPPORT } from '../config/support'
import { shareApp } from '../lib/share'

export default function Join({ onBack, onApply, onSupport }) {
  return (
    <div>
      <div className="row between">
        <h2>Rejoindre l'équipe</h2>
        <button className="link" onClick={onBack}>
          ✕
        </button>
      </div>
      <p className="muted">
        Bransh se construit avec ses habitants. Il y a une place pour toi, que tu aies dix minutes ou des compétences
        techniques.
      </p>

      <div className="card join-card">
        <span className="join-emoji" aria-hidden="true">
          🔎
        </span>
        <div>
          <h3 className="flush">Vérificateur de quartier</h3>
          <p className="muted">
            Tu connais bien ton quartier ? Aide à confirmer ou démentir les informations signalées, et explique ta
            décision. Tu choisis ton rythme.
          </p>
          <button
            className="secondary"
            onClick={() =>
              onApply({
                topic: 'benevole',
                message:
                  'Bonjour, je souhaite devenir vérificateur.\n\nMon quartier ou ma ville :\nMes disponibilités :\nPourquoi je veux aider :',
              })
            }
          >
            Je veux vérifier
          </button>
        </div>
      </div>

      <div className="card join-card">
        <span className="join-emoji" aria-hidden="true">
          📣
        </span>
        <div>
          <h3 className="flush">Relais Bransh</h3>
          <p className="muted">
            Parle de Bransh dans ton quartier, ton association, ton université ou ton groupe WhatsApp. Plus il y a de
            monde, plus l'information est fiable.
          </p>
          <button className="secondary" onClick={shareApp}>
            Partager Bransh
          </button>
        </div>
      </div>

      <div className="card join-card">
        <span className="join-emoji" aria-hidden="true">
          💻
        </span>
        <div>
          <h3 className="flush">Développeur·se ou designer</h3>
          <p className="muted">
            Bransh est open source. Le code, les idées de tâches et le guide de contribution sont sur GitHub.
          </p>
          <a className="secondary linkbtn" href={SUPPORT.repoUrl} target="_blank" rel="noreferrer">
            Voir le projet
          </a>
        </div>
      </div>

      <div className="card join-card">
        <span className="join-emoji" aria-hidden="true">
          🤝
        </span>
        <div>
          <h3 className="flush">Média, association, université, mairie</h3>
          <p className="muted">
            Devenez partenaire de vérification : votre expertise renforce la confiance dans les informations publiées.
          </p>
          <button
            className="secondary"
            onClick={() =>
              onApply({
                topic: 'benevole',
                message:
                  'Bonjour, nous représentons une organisation et souhaitons devenir partenaire de Bransh.\n\nNom de l’organisation :\nNotre domaine :\nCe que nous pouvons apporter :',
              })
            }
          >
            Nous écrire
          </button>
        </div>
      </div>

      <button className="card support-link" onClick={onSupport}>
        <span>
          <strong>❤ Soutenir Bransh</strong>
          <span className="muted"> · dons</span>
        </span>
        <span aria-hidden="true">→</span>
      </button>
    </div>
  )
}
