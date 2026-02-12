import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { SignInWithGoogle } from './SignInWithGoogle'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      navigate('/trips')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>AutoSplit</h2>
        <h3 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.25rem' }}>Welcome Back</h3>

        <div className="form-group">
          <label>Email Address</label>
          <input
            placeholder="name@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

        <button className="btn-primary" onClick={login} style={{ width: '100%', marginBottom: '1rem' }}>
          Sign In
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          <span style={{ padding: '0 10px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
        </div>

        <SignInWithGoogle />
      </div>
    </div>
  )
}
