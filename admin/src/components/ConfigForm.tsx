import { useState, useEffect } from 'react'
import { Disc3, Music, LogOut, CheckCircle, AlertCircle, Loader2, Database, Calendar, RefreshCw } from 'lucide-react'
import type { Config, TestResult } from '../types'
import './styles.css'

interface ConfigFormProps {
  onLogout: () => void
}

interface SystemStatus {
  hasMongoConnection: boolean
  hasSpotifyConfig: boolean
  nextCronRunDescription: string
  timestamp: string
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
  const [savingSpotify, setSavingSpotify] = useState(false)
  const [spotifySaveStatus, setSpotifySaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [testingSpotify, setTestingSpotify] = useState(false)
  const [spotifyResult, setSpotifyResult] = useState<TestResult | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  // Fetch system status on mount
  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setSystemStatus(data)
    } catch {
      console.error('Failed to fetch status')
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setConfig(prev => ({ ...prev, [name]: value }))
    setSpotifySaveStatus(null)
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

  // Save Spotify config
  const saveSpotify = async () => {
    if (!config.SPOTIFY_CLIENT_ID || !config.SPOTIFY_CLIENT_SECRET || !config.SPOTIFY_USER_ID || !config.SPOTIFY_REFRESH_TOKEN) {
      setSpotifySaveStatus({ type: 'error', message: 'Fill in all Spotify fields' })
      return
    }
    setSavingSpotify(true)
    setSpotifySaveStatus(null)
    try {
      const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
      const res = await fetch('/api/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          section: 'spotify',
          SPOTIFY_CLIENT_ID: config.SPOTIFY_CLIENT_ID,
          SPOTIFY_CLIENT_SECRET: config.SPOTIFY_CLIENT_SECRET,
          SPOTIFY_USER_ID: config.SPOTIFY_USER_ID,
          SPOTIFY_REFRESH_TOKEN: config.SPOTIFY_REFRESH_TOKEN
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSpotifySaveStatus({ type: 'success', message: 'Spotify config saved!' })
        fetchStatus() // Refresh status
      } else {
        setSpotifySaveStatus({ type: 'error', message: data.error || 'Failed to save' })
      }
    } catch {
      setSpotifySaveStatus({ type: 'error', message: 'Connection failed' })
    } finally {
      setSavingSpotify(false)
    }
  }

  return (
    <>
      <header className="header">
        <div className="logo">
          <Disc3 size={22} />
          <h1>Digital Diggaz</h1>
        </div>
        <p className="subtitle">Dashboard</p>
      </header>

      {/* System Status Card */}
      <div className="card status-card">
        <div className="section-header">
          <Database size={14} className="section-icon" />
          <h2 className="section-title">System Status</h2>
          <button type="button" className="btn-test" onClick={fetchStatus} disabled={loadingStatus}>
            {loadingStatus ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          </button>
        </div>

        <div className="status-grid">
          <div className="status-item">
            <div className={`status-dot ${systemStatus?.hasMongoConnection ? 'ok' : 'error'}`} />
            <span>MongoDB</span>
          </div>
          <div className="status-item">
            <div className={`status-dot ${systemStatus?.hasSpotifyConfig ? 'ok' : 'error'}`} />
            <span>Spotify</span>
          </div>
        </div>

        <div className="next-run">
          <Calendar size={14} />
          <span>Next run: {systemStatus?.nextCronRunDescription || 'Loading...'}</span>
        </div>
      </div>

      {/* Spotify Config Card */}
      <div className="card">
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
          />
        </div>

        {spotifySaveStatus && (
          <div className={`status ${spotifySaveStatus.type}`}>
            {spotifySaveStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {spotifySaveStatus.message}
          </div>
        )}

        <button type="button" className="btn" onClick={saveSpotify} disabled={savingSpotify}>
          {savingSpotify ? 'Saving...' : 'Save Spotify Config'}
        </button>
      </div>

      {/* Logout Button */}
      <button className="btn-logout-standalone" onClick={onLogout}>
        <LogOut size={14} />
        Logout
      </button>
    </>
  )
}
