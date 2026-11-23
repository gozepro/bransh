import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthForm({ onDone, note }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name.trim() || 'Citoyen' } },
      })
      if (error) setError(error.message)
      else if (data.session) onDone()
      else setInfo('Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else onDone()
    }
    setBusy(false)
  }

  return (
    <div className="card">
      <h2>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h2>
      {note && <p className="notice">{note}</p>}

      <form onSubmit={submit}>
        {mode === 'signup' && (
          <label>
            Ton nom ou pseudo
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Kouamé D." />
          </label>
        )}
        <label>
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="error">{error}</p>}
        {info && <p className="notice">{info}</p>}

        <button className="primary" disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>

      <button
        className="link"
        onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login')
          setError(null)
          setInfo(null)
        }}
      >
        {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
      </button>
    </div>
  )
}
