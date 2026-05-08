import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

function MemberForm() {
  const [tab, setTab] = useState('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const emailRef = useRef()
  const passwordRef = useRef()
  const nameRef = useRef()

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: emailRef.current.value,
      password: passwordRef.current.value,
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const email = emailRef.current.value
    const { data, error } = await supabase.auth.signUp({
      email,
      password: passwordRef.current.value,
      options: { data: { full_name: nameRef.current.value } }
    })
    if (error) {
      setError(error.message)
    } else {
      if (data?.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: email.trim().toLowerCase(),
          full_name: nameRef.current.value,
        })
      }
      setSuccess('Check your email to confirm your account!')
    }
    setLoading(false)
  }

  const handleGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' }
    })
  }

  const switchTab = (t) => { setTab(t); setError(''); setSuccess('') }

  return (
    <>
      <div className="auth-tabs" style={{ marginBottom: 36 }}>
        <button className={`auth-tab ${tab === 'signin' ? 'active' : ''}`} onClick={() => switchTab('signin')}>Sign In</button>
        <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => switchTab('signup')}>Sign Up</button>
      </div>

      {tab === 'signin' ? (
        <>
          <div className="auth-title">Welcome Back</div>
          <div className="auth-subtitle">Sign in to your FitCog account</div>
          <form onSubmit={handleSignIn}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" ref={emailRef} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" ref={passwordRef} required />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="divider">or</div>
          <button className="google-btn" onClick={handleGoogle}>{GOOGLE_SVG} Continue with Google</button>
        </>
      ) : (
        <>
          <div className="auth-title">Join FitCog</div>
          <div className="auth-subtitle">Create your account to get started</div>
          <form onSubmit={handleSignUp}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="James Jasper" ref={nameRef} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" ref={emailRef} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min. 6 characters" ref={passwordRef} required minLength={6} />
            </div>
            {error && <div className="error-msg">{error}</div>}
            {success && <div className="success-msg">{success}</div>}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <div className="divider">or</div>
          <button className="google-btn" onClick={handleGoogle}>{GOOGLE_SVG} Continue with Google</button>
        </>
      )}
    </>
  )
}

function TrainerForm({ setTrainer }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const usernameRef = useRef()
  const passwordRef = useRef()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error: err } = await supabase
      .from('trainers')
      .select('*')
      .eq('username', usernameRef.current.value.trim())
      .eq('password', passwordRef.current.value)
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
    <>
      <div className="auth-title">Trainer Portal</div>
      <div className="auth-subtitle">Sign in with your trainer credentials</div>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" placeholder="trainer_username" ref={usernameRef} required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="••••••••" ref={passwordRef} required />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </>
  )
}

function AdminForm({ setAdmin }) {
  const [error, setError] = useState('')
  const emailRef = useRef()
  const passwordRef = useRef()

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    if (emailRef.current.value.trim().toLowerCase() === ADMIN_EMAIL && passwordRef.current.value === ADMIN_PASSWORD) {
      sessionStorage.setItem('fitcog_admin', '1')
      setAdmin(true)
    } else {
      setError('Invalid admin credentials')
    }
  }

  return (
    <>
      <div className="auth-title">Admin Access</div>
      <div className="auth-subtitle">Restricted area — admin credentials required</div>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label">Admin Email</label>
          <input className="form-input" type="email" placeholder="admin@fitcog.com" ref={emailRef} required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="••••••••••••" ref={passwordRef} required />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          Access Admin Panel
        </button>
      </form>
    </>
  )
}

export default function AuthPage() {
  const { setTrainer, setAdmin } = useApp()
  const [role, setRole] = useState('member')

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-logo">FITCOG</div>
        <div className="auth-left-tagline">
          Your personal gym. Track sessions, book trainers, crush goals.
        </div>
        <div className="auth-features">
          {['Book sessions with expert trainers', 'Track your streaks & progress', 'Flexible subscription plans', 'Manage everything in one place'].map(f => (
            <div key={f} className="auth-feature">
              <div className="auth-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-tabs" style={{ marginBottom: 28 }}>
          {[['member', 'Member'], ['trainer', 'Trainer'], ['admin', 'Admin']].map(([r, label]) => (
            <button key={r} className={`auth-tab ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>
              {label}
            </button>
          ))}
        </div>

        {role === 'member' && <MemberForm />}
        {role === 'trainer' && <TrainerForm setTrainer={setTrainer} />}
        {role === 'admin' && <AdminForm setAdmin={setAdmin} />}
      </div>
    </div>
  )
}
