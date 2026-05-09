import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'



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
        </>
      ) : (
        <>
          <div className="auth-title">Join FitCog</div>
          <div className="auth-subtitle">Create your account to get started</div>
          <form onSubmit={handleSignUp}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="Your full name" ref={nameRef} required />
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const emailRef = useRef()
  const passwordRef = useRef()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error: err } = await supabase
      .from('admins')
      .select('id')
      .eq('email', emailRef.current.value.trim().toLowerCase())
      .eq('password', passwordRef.current.value)
      .limit(1)
    if (err || !data || data.length === 0) {
      setError('Invalid admin credentials')
    } else {
      sessionStorage.setItem('fitcog_admin', '1')
      setAdmin(true)
    }
    setLoading(false)
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
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
          {loading ? 'Signing in...' : 'Access Admin Panel'}
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
