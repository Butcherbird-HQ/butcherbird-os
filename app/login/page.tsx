'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Incorrect password.')
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="gold-line" />
        <div className="login-logo">Butcherbird</div>
        <div className="login-sub">Operating System</div>
        <form onSubmit={handleSubmit}>
          <input
            className="login-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Enter'}
          </button>
          {error && <div className="login-error">{error}</div>}
        </form>
      </div>
    </div>
  )
}
