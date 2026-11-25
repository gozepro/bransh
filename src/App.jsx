import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthForm from './components/AuthForm'
import ReportForm from './components/ReportForm'
import Feed from './components/Feed'
import ReportDetail from './components/ReportDetail'
import Profile from './components/Profile'
import Support from './components/Support'
import Settings from './components/Settings'
import Help from './components/Help'
import Join from './components/Join'
import { useInstall } from './lib/useInstall'
import { CITIES } from './lib/cities'
import { useCity } from './lib/useCity'

// La carte (WebGL) est chargée seulement quand on l'ouvre : le fil s'affiche plus vite sur mobile
const MapView = lazy(() => import('./components/MapView'))

function parseHash() {
  const m = window.location.hash.match(/^#r-([0-9a-f-]{36})$/i)
  return m ? m[1] : null
}

const icons = {
  home: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
}

export default function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('citizen')
  const [ready, setReady] = useState(false)
  const [detailId, setDetailId] = useState(parseHash)
  const [view, setView] = useState(() => (parseHash() ? 'detail' : 'feed')) // 'feed' | 'map' | 'report' | 'auth' | 'detail' | 'profile' | 'support' | 'settings' | 'help' | 'join'
  const [afterAuth, setAfterAuth] = useState('feed')
  const [refreshKey, setRefreshKey] = useState(0)
  const [themePref, setThemePrefState] = useState(() => {
    try {
      const v = localStorage.getItem('bransh-theme')
      return v === 'light' || v === 'dark' ? v : 'auto'
    } catch {
      return 'auto'
    }
  })
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const theme = themePref === 'auto' ? (systemDark ? 'dark' : 'light') : themePref
  const [settingsSection, setSettingsSection] = useState(null)
  const contentRef = useRef(null)
  const { city, outside, detecting, choose, locate } = useCity()
  const install = useInstall()
  const [helpPreset, setHelpPreset] = useState(null)

  const setThemePref = (value) => {
    setThemePrefState(value)
    try {
      if (value === 'auto') localStorage.removeItem('bransh-theme')
      else localStorage.setItem('bransh-theme', value)
    } catch {
      /* stockage indisponible : le choix ne sera simplement pas mémorisé */
    }
  }

  const toggleTheme = () => setThemePref(theme === 'dark' ? 'light' : 'dark')

  // Suit le réglage du système quand le thème est « automatique »
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Applique le thème à la page
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0d0e12' : '#faf7f2')
  }, [theme])

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

  // Remonter en haut à chaque changement d'écran
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0)
  }, [view, detailId])

  const openReport = (id) => {
    window.location.hash = `r-${id}`
  }

  const clearHash = () => {
    if (window.location.hash) window.location.hash = ''
  }

  const goFeed = () => {
    setView('feed')
    clearHash()
  }

  const goMap = () => {
    setView('map')
    clearHash()
  }

  const goReport = () => {
    if (session) {
      setView('report')
    } else {
      setAfterAuth('report')
      setView('auth')
    }
  }

  const goProfile = () => {
    if (session) {
      setView('profile')
      clearHash()
    } else {
      setAfterAuth('profile')
      setView('auth')
    }
  }

  const goSupport = () => {
    setView('support')
    clearHash()
  }

  const goSettings = (section = null) => {
    setSettingsSection(section)
    setView('settings')
    clearHash()
  }

  const goHelp = (preset = null) => {
    // onClick transmet un événement : on ne garde que les vrais préréglages
    setHelpPreset(preset && preset.topic ? preset : null)
    setView('help')
    clearHash()
  }

  const goJoin = () => {
    setView('join')
    clearHash()
  }

  // Candidature depuis « Rejoindre » : il faut un compte pour écrire à l'équipe
  const apply = (preset) => {
    if (session) {
      goHelp(preset)
    } else {
      setHelpPreset(preset)
      setAfterAuth('help')
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

  if (!ready) return <p className="center loading">Chargement…</p>

  const roleLabel = role === 'verifier' ? 'Vérificateur' : role === 'moderator' ? 'Modérateur' : 'Admin'

  return (
    <div className="shell">
      <aside className="side-note">
        <div className="logo big">
          bransh<span>.</span>
        </div>
        <p>L'information au plus près de vous, vérifiée ensemble.</p>
        <p className="muted">
          Bransh est pensée pour le téléphone. Ouvre-la sur ton mobile, puis ajoute-la à ton écran d'accueil pour la
          retrouver comme une application.
        </p>
      </aside>

      <div className="app">
        <header className="topbar">
          <button className="logo" onClick={goFeed} aria-label="Retour à l'accueil">
            bransh<span>.</span>
          </button>
          <div className="row">
            {role !== 'citizen' && <span className="badge green">{roleLabel}</span>}
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
              title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
            >
              {theme === 'dark' ? icons.sun : icons.moon}
            </button>
            {!session ? (
              <button className="link" onClick={goLogin}>
                Connexion
              </button>
            ) : role === 'admin' ? (
              <button className="link" onClick={logout}>
                Déconnexion
              </button>
            ) : (
              <button className="help-btn" onClick={goHelp}>
                <span aria-hidden="true">?</span> Aide
              </button>
            )}
          </div>
        </header>

        <main ref={contentRef} className={view === 'map' ? 'content content-map' : 'content'}>
          {view === 'feed' && (
            <>
              <p className="eyebrow">
                <span className="live-dot" /> L'information au plus près de vous
              </p>
              <h1>
                {city.name}, en temps réel<span className="dot">.</span>
              </h1>
              <p className="muted">Comprendre ce qui se passe. Vérifier ensemble. Agir localement.</p>
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
              {outside && (
                <p className="hint">Bransh n'est pas encore active près de toi : voici {city.name}.</p>
              )}
              <Feed refreshKey={refreshKey} onOpen={openReport} city={city} />
              <div className="card footer-card">
                <strong>Bransh est gratuite et open source</strong>
                <div className="row">
                  <button className="secondary" onClick={goSupport}>
                    ❤ Soutenir
                  </button>
                  <button className="secondary" onClick={goJoin}>
                    Rejoindre l'équipe
                  </button>
                </div>
              </div>
            </>
          )}

          {view === 'map' && (
            <Suspense fallback={<p className="muted pad">Chargement de la carte…</p>}>
              <MapView onOpen={openReport} theme={theme} center={[city.lng, city.lat]} />
            </Suspense>
          )}

          {view === 'profile' && session && (
            <Profile user={session.user} onOpenReport={openReport} onSupport={goSupport} onSettings={goSettings} onLogout={logout} />
          )}

          {view === 'settings' && (
            <Settings
              key={settingsSection || 'main'}
              user={session?.user}
              role={role}
              themePref={themePref}
              setThemePref={setThemePref}
              city={city}
              choose={choose}
              locate={locate}
              detecting={detecting}
              onSupport={goSupport}
              onHelp={goHelp}
              onJoin={goJoin}
              install={install}
              onBack={() => (session ? setView('profile') : goFeed())}
              onLogout={logout}
              initialSection={settingsSection}
            />
          )}

          {view === 'help' && (
            <Help
              key={helpPreset ? helpPreset.message : 'libre'}
              user={session?.user}
              preset={helpPreset}
              onBack={() => (session ? setView('profile') : goFeed())}
            />
          )}

          {view === 'join' && <Join onBack={goFeed} onApply={apply} onSupport={goSupport} />}

          {view === 'support' && <Support onBack={() => (session ? setView('profile') : goFeed())} />}

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
              onPrivacy={() => goSettings('privacy')}
              note={
                afterAuth === 'report'
                  ? 'Connecte-toi pour envoyer un signalement.'
                  : afterAuth === 'detail'
                    ? 'Connecte-toi pour confirmer ou contester une information.'
                    : afterAuth === 'profile'
                      ? 'Connecte-toi pour accéder à ton profil.'
                      : afterAuth === 'help'
                        ? 'Connecte-toi pour écrire à l’équipe.'
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
            {icons.home}
            Accueil
          </button>
          <button className={view === 'map' ? 'active' : ''} onClick={goMap}>
            {icons.map}
            Carte
          </button>
          <button className={view === 'report' ? 'cta active' : 'cta'} onClick={goReport}>
            {icons.plus}
            Signaler
          </button>
          <button className={view === 'profile' || view === 'support' || view === 'settings' ? 'active' : ''} onClick={goProfile}>
            {icons.user}
            Profil
          </button>
        </nav>
      </div>
    </div>
  )
}
