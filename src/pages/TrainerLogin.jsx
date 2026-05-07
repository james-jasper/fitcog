import { useState } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'

export default function TrainerLogin() {
  const { setTrainer } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')

    const { data, error: err } = await supabase
      .from('trainers')
      .select('*')
      .eq('username', username.trim())
      .eq('password', password)
      .limit(1)

    if (err || !data || data.length === 0) {
      setError('Invalid username or password')
    } else {
      const trainer = data[0]
      sessionStorage.setItem('fitcog_trainer', JSON.stringify(trainer))
      setTrainer(trainer)
    }
    setLoading(false)
  }

  return (
    <div className="trainer-login-page">
      <div className="trainer-login-box">
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 14, letterSpacing: 4, color: 'var(--accent)', marginBottom: 8 }}>FITCOG</div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 36, letterSpacing: 3, marginBottom: 8 }}>Trainer Portal</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 32 }}>Sign in with your trainer credentials</div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              placeholder="trainer_username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <a href="/" style={{ color: 'var(--muted)', fontSize: 13, textDecoration: 'none' }}>← Back to Member Login</a>
        </div>
      </div>
    </div>
  )
}
