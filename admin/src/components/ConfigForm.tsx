import { useState } from 'react'
import { Disc3, Users, Music, LogOut, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { Config, TestResult } from '../types'
import './styles.css'

interface ConfigFormProps {
  onLogout: () => void
}

const initialConfig: Config = {
  GROUP_ID: '',
  FB_TOKEN: '',
  SPOTIFY_CLIENT_ID: '',
  SPOTIFY_CLIENT_SECRET: '',
  SPOTIFY_USER_ID: '',
  SPOTIFY_REFRESH_TOKEN: ''
}

export function ConfigForm({ onLogout }: ConfigFormProps) {
  const [config, setConfig] = useState<Config>(initialConfig)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [testingFb, setTestingFb] = useState(false)
  const [testingSpotify, setTestingSpotify] = useState(false)
  const [fbResult, setFbResult] = useState<TestResult | null>(null)
  const [spotifyResult, setSpotifyResult] = useState<TestResult | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setConfig(prev => ({ ...prev, [name]: value }))
    setStatus(null)
  }

  const testFacebook = async () => {
    if (!config.GROUP_ID || !config.FB_TOKEN) {
      setFbResult({ success: false, message: 'Fill in Group ID and Token first' })
      return
    }
    setTestingFb(true)
    setFbResult(null)
    try {
      const res = await fetch('/api/test/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: config.GROUP_ID, token: config.FB_TOKEN })
      })
      const data = await res.json()
      setFbResult({ success: data.success, message: data.message || data.error })
    } catch {
      setFbResult({ success: false, message: 'Connection failed' })
    } finally {
      setTestingFb(false)
    }
  }

  const testSpotify = async () => {
    if (!config.SPOTIFY_CLIENT_ID || !config.SPOTIFY_CLIENT_SECRET || !config.SPOTIFY_REFRESH_TOKEN) {
      setSpotifyResult({ success: false, message: 'Fill in Client ID, Secret, and Refresh Token first' })
      return
    }
    setTestingSpotify(true)
    setSpotifyResult(null)
    try {
      const res = await fetch('/api/test/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: config.SPOTIFY_CLIENT_ID,
          clientSecret: config.SPOTIFY_CLIENT_SECRET,
          refreshToken: config.SPOTIFY_REFRESH_TOKEN
        })
      })
      const data = await res.json()
      setSpotifyResult({ success: data.success, message: data.message || data.error })
    } catch {
      setSpotifyResult({ success: false, message: 'Connection failed' })
    } finally {
      setTestingSpotify(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)

    try {
      const token = sessionStorage.getItem('admin_token')
      const res = await fetch('/api/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setStatus({ type: 'success', message: 'Configuration saved successfully' })
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to save' })
      }
    } catch {
      setStatus({ type: 'error', message: 'Connection failed' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <header className="header">
        <div className="logo">
          <Disc3 size={22} />
          <h1>Digital Diggaz</h1>
        </div>
        <p className="subtitle">API Configuration</p>
      </header>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="section-header">
            <Users size={14} className="section-icon" />
            <h2 className="section-title">Facebook</h2>
            <button type="button" className="btn-test" onClick={testFacebook} disabled={testingFb}>
              {testingFb ? <Loader2 size={14} className="spin" /> : 'Test'}
            </button>
          </div>

          {fbResult && (
            <div className={`status ${fbResult.success ? 'success' : 'error'}`}>
              {fbResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {fbResult.message}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="GROUP_ID">Group ID</label>
            <input
              type="text"
              id="GROUP_ID"
              name="GROUP_ID"
              value={config.GROUP_ID}
              onChange={handleChange}
              placeholder="2880828481939428"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="FB_TOKEN">Access Token</label>
            <input
              type="password"
              id="FB_TOKEN"
              name="FB_TOKEN"
              value={config.FB_TOKEN}
              onChange={handleChange}
              placeholder="Long-lived user token"
              required
            />
          </div>

          <div className="divider" />

          <div className="section-header">
            <Music size={14} className="section-icon" />
            <h2 className="section-title">Spotify</h2>
            <button type="button" className="btn-test" onClick={testSpotify} disabled={testingSpotify}>
              {testingSpotify ? <Loader2 size={14} className="spin" /> : 'Test'}
            </button>
          </div>

          {spotifyResult && (
            <div className={`status ${spotifyResult.success ? 'success' : 'error'}`}>
              {spotifyResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {spotifyResult.message}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="SPOTIFY_CLIENT_ID">Client ID</label>
            <input
              type="text"
              id="SPOTIFY_CLIENT_ID"
              name="SPOTIFY_CLIENT_ID"
              value={config.SPOTIFY_CLIENT_ID}
              onChange={handleChange}
              placeholder="From Developer Dashboard"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="SPOTIFY_CLIENT_SECRET">Client Secret</label>
            <input
              type="password"
              id="SPOTIFY_CLIENT_SECRET"
              name="SPOTIFY_CLIENT_SECRET"
              value={config.SPOTIFY_CLIENT_SECRET}
              onChange={handleChange}
              placeholder="Keep this private"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="SPOTIFY_USER_ID">User ID</label>
            <input
              type="text"
              id="SPOTIFY_USER_ID"
              name="SPOTIFY_USER_ID"
              value={config.SPOTIFY_USER_ID}
              onChange={handleChange}
              placeholder="Your Spotify username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="SPOTIFY_REFRESH_TOKEN">Refresh Token</label>
            <input
              type="password"
              id="SPOTIFY_REFRESH_TOKEN"
              name="SPOTIFY_REFRESH_TOKEN"
              value={config.SPOTIFY_REFRESH_TOKEN}
              onChange={handleChange}
              placeholder="OAuth refresh token"
              required
            />
          </div>

          {status && (
            <div className={`status ${status.type}`}>
              {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {status.message}
            </div>
          )}

          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>

        <button className="btn-logout" onClick={onLogout}>
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </>
  )
}
