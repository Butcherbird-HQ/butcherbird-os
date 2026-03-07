'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.refresh()
    router.push('/dashboard')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <svg className="login-bird" viewBox="0 0 100 100" fill="currentColor" style={{ color: 'var(--gold)' }}>
            <path d="M72,28 C68,22 60,20 52,24 C46,26 40,30 36,36 C32,42 30,50 32,56 C28,54 24,54 20,56 C24,52 26,46 24,42 C22,38 18,36 14,38 C18,34 24,32 30,34 C26,28 20,26 14,28 C20,22 28,20 36,22 C44,14 56,12 66,16 C76,20 82,30 80,40 C78,48 72,54 64,56 C68,50 72,42 72,34 C74,32 74,30 72,28 Z M38,58 C34,62 28,64 22,62 C26,58 32,56 38,58 Z"/>
            <line x1="10" y1="70" x2="90" y2="70" stroke="currentColor" strokeWidth="3"/>
            <circle cx="20" cy="70" r="3"/>
            <circle cx="50" cy="70" r="3"/>
            <circle cx="80" cy="70" r="3"/>
          </svg>
          <div>
            <div className="login-logo">Butcherbird</div>
            <div className="login-sub">Operating System</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="login-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            required
          />
          <input
            className="login-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          {error && <div className="login-error">{error}</div>}
        </form>
      </div>
    </div>
  )
}
