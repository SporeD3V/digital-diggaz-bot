import { useState } from 'react'
import { Lock } from 'lucide-react'
import './styles.css'

interface LoginProps {
  onLogin: (token: string, rememberMe: boolean) => void
}

export function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (res.ok && data.token) {
        onLogin(data.token, rememberMe)
      } else {
        setError(data.error || 'Invalid password')
      }
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="header">
        <div className="logo">
          <Lock size={22} />
          <h1>Digital Diggaz</h1>
        </div>
        <p className="subtitle">Admin Access</p>
      </header>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
              required
            />
          </div>

          {error && <div className="status error">{error}</div>}

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe">Remember me</label>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    </>
  )
}
