import { useState, useEffect } from 'react'
import { Login } from './components/Login'
import { ConfigForm } from './components/ConfigForm'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
    if (token) {
      verifyToken(token)
    } else {
      setChecking(false)
    }
  }, [])

  const verifyToken = async (token: string) => {
    try {
      const res = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setAuthenticated(true)
      } else {
        localStorage.removeItem('admin_token')
        sessionStorage.removeItem('admin_token')
      }
    } catch {
      localStorage.removeItem('admin_token')
      sessionStorage.removeItem('admin_token')
    } finally {
      setChecking(false)
    }
  }

  const handleLogin = (token: string, rememberMe: boolean) => {
    if (rememberMe) {
      localStorage.setItem('admin_token', token)
    } else {
      sessionStorage.setItem('admin_token', token)
    }
    setAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    sessionStorage.removeItem('admin_token')
    setAuthenticated(false)
  }

  if (checking) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        Loading...
      </div>
    )
  }

  return authenticated ? (
    <ConfigForm onLogout={handleLogout} />
  ) : (
    <Login onLogin={handleLogin} />
  )
}

export default App
