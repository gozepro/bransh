import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthForm from './components/AuthForm'
import ReportForm from './components/ReportForm'
import Feed from './components/Feed'
import ReportDetail from './components/ReportDetail'
import MapView from './components/MapView'

function parseHash() {
  const m = window.location.hash.match(/^#r-([0-9a-f-]{36})$/i)
  return m ? m[1] : null
}

export default function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('citizen')
  const [ready, setReady] = useState(false)
  const [detailId, setDetailId] = useState(parseHash)
  const [view, setView] = useState(() => (parseHash() ? 'detail' : 'feed')) // 'feed' | 'map' | 'report' | 'auth' | 'detail'
  const [afterAuth, setAfterAuth] = useState('feed')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Rôle de l'utilisateur connecté (citoyen, vérificateur, modérateur, admin)
  useEffect(() => {
    if (!session) {
      setRole('citizen')
      return
    }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setRole(data?.role || 'citizen'))
  }, [session])

  // Liens partageables : /#r-<id> ouvre directement un signalement
  useEffect(() => {
    const onHash = () => {
      const id = parseHash()
      if (id) {
        setDetailId(id)
        setView('detail')
      } else {
        setView((v) => (v === 'detail' ? 'feed' : v))
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const openReport = (id) => {
    window.location.hash = `r-${id}`
  }

  const goFeed = () => {
    setView('feed')
    if (window.location.hash) window.location.hash = ''
  }

  const goMap = () => {
    setView('map')
    if (window.location.hash) window.location.hash = ''
  }

  const goReport = () => {
    if (session) {
      setView('report')
    } else {
      setAfterAuth('report')
      setView('auth')
    }
  }

  const goLogin = () => {
    setAfterAuth('feed')
    setView('auth')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    goFeed()
  }

  if (!ready) return <p className="center">Chargement…</p>

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          bransh<span>.</span>
        </div>
        <div className="row">
          {role !== 'citizen' && <span className="badge green">{role === 'verifier' ? 'Vérificateur' : role === 'moderator' ? 'Modérateur' : 'Admin'}</span>}
          {session ? (
            <button className="link" onClick={logout}>
              Déconnexion
            </button>
          ) : (
            <button className="link" onClick={goLogin}>
              Connexion
            </button>
          )}
        </div>
      </header>

      <main className="content">
        {view === 'feed' && (
          <>
            <p className="eyebrow">L'information au plus près de vous</p>
            <h1>
              Abidjan, en temps réel<span className="dot">.</span>
            </h1>
            <p className="muted">Comprendre ce qui se passe. Vérifier ensemble. Agir localement.</p>
            <Feed refreshKey={refreshKey} onOpen={openReport} />
          </>
        )}

        {view === 'map' && (
          <>
            <p className="eyebrow">Autour de vous</p>
            <h1>
              La carte<span className="dot">.</span>
            </h1>
            <MapView onOpen={openReport} />
          </>
        )}

        {view === 'detail' && detailId && (
          <ReportDetail
            id={detailId}
            userId={session?.user?.id}
            role={role}
            onBack={goFeed}
            onNeedAuth={() => {
              setAfterAuth('detail')
              setView('auth')
            }}
          />
        )}

        {view === 'auth' && (
          <AuthForm
            onDone={() => setView(afterAuth)}
            note={
              afterAuth === 'report'
                ? 'Connecte-toi pour envoyer un signalement.'
                : afterAuth === 'detail'
                  ? 'Connecte-toi pour confirmer ou contester une information.'
                  : null
            }
          />
        )}

        {view === 'report' && session && (
          <ReportForm
            user={session.user}
            onCreated={() => {
              setRefreshKey((k) => k + 1)
              setView('feed')
            }}
            onClose={() => setView('feed')}
          />
        )}
      </main>

      <nav className="bottomnav">
        <button className={view === 'feed' || view === 'detail' ? 'active' : ''} onClick={goFeed}>
          Accueil
        </button>
        <button className={view === 'map' ? 'active' : ''} onClick={goMap}>
          Carte
        </button>
        <button className={view === 'report' ? 'active' : ''} onClick={goReport}>
          Signaler
        </button>
      </nav>
    </div>
  )
}
