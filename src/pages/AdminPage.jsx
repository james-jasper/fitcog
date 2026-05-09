import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'

const PLANS = [
  { id: 'basic', name: 'Starter', sessions: 12, price: 8000 },
  { id: 'premium', name: 'Premium', sessions: 30, price: 16000 },
]

export default function AdminPage() {
  const { logoutAdmin } = useApp()

  const [trainers, setTrainers] = useState([])
  const [trainerForm, setTrainerForm] = useState({ name: '', username: '', password: '', specialization: '', max_capacity: 1 })
  const [editId, setEditId] = useState(null)
  const [showPasswords, setShowPasswords] = useState({})

  const [subEmail, setSubEmail] = useState('')
  const [subPlan, setSubPlan] = useState('basic')
  const [subLoading, setSubLoading] = useState(false)
  const [subMsg, setSubMsg] = useState(null)

  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('subscriptions')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetchTrainers()
  }, [])

  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
  }, [activeTab])

  const fetchUsers = async () => {
    setUsersLoading(true)
    const [{ data: profiles }, { data: subs }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('user_id, plan, total_sessions, sessions_used, status').eq('status', 'active'),
    ])
    if (profiles) {
      const subMap = {}
      subs?.forEach(s => { subMap[s.user_id] = s })
      setUsers(profiles.map(p => ({ ...p, activeSub: subMap[p.id] || null })))
    }
    setUsersLoading(false)
  }

  const handleRemoveUser = async (user) => {
    if (!confirm(`Remove "${user.full_name || user.email}"? This will permanently delete their account, subscription, and all bookings.`)) return
    const { error } = await supabase.rpc('delete_user', { p_user_id: user.id })
    if (error) { showToast(error.message, 'error'); return }
    showToast(`${user.full_name || user.email} removed`, 'error')
    setUsers(prev => prev.filter(u => u.id !== user.id))
  }

  const fetchTrainers = async () => {
    const { data } = await supabase.from('trainers').select('*').order('created_at', { ascending: true })
    if (data) setTrainers(data)
  }

  // Activate subscription for a user by email
  const handleActivateSub = async (e) => {
    e.preventDefault()
    setSubLoading(true)
    setSubMsg(null)

    // Look up user profile by email
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', subEmail.trim().toLowerCase())
      .limit(1)

    if (profileErr || !profiles || profiles.length === 0) {
      setSubMsg({ type: 'error', text: `No user found with email "${subEmail}". Make sure they have signed up first.` })
      setSubLoading(false)
      return
    }

    const userId = profiles[0].id
    const plan = PLANS.find(p => p.id === subPlan)

    const { error: subErr } = await supabase.rpc('activate_subscription', {
      p_user_id: userId,
      p_plan: plan.id,
      p_total_sessions: plan.sessions,
      p_amount: plan.price,
    })

    if (subErr) {
      setSubMsg({ type: 'error', text: subErr.message })
    } else {
      setSubMsg({ type: 'success', text: `${plan.name} plan activated for ${subEmail}! (${plan.sessions} sessions)` })
      setSubEmail('')
    }
    setSubLoading(false)
  }

  // Trainer CRUD
  const handleTrainerSubmit = async (e) => {
    e.preventDefault()
    if (editId) {
      const { error } = await supabase.from('trainers').update(trainerForm).eq('id', editId)
      if (!error) { showToast('Trainer updated!'); setEditId(null) }
      else showToast(error.message, 'error')
    } else {
      const { error } = await supabase.from('trainers').insert(trainerForm)
      if (!error) showToast('Trainer added!')
      else showToast(error.message, 'error')
    }
    setTrainerForm({ name: '', username: '', password: '', specialization: '', max_capacity: 1 })
    fetchTrainers()
  }

  const handleEdit = (t) => {
    setEditId(t.id)
    setTrainerForm({ name: t.name, username: t.username, password: t.password, specialization: t.specialization || '', max_capacity: t.max_capacity || 1 })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this trainer? Their bookings will be cancelled.')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('trainer_id', id)
    const { error } = await supabase.from('trainers').delete().eq('id', id)
    if (error) showToast(error.message, 'error')
    else { showToast('Trainer deleted', 'error'); fetchTrainers() }
  }

  const togglePassword = (id) => setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="admin-page" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div className="admin-title">Admin <span>Panel</span></div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Manage subscriptions and trainer accounts</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/"><button className="btn btn-outline btn-sm">← App</button></a>
          <button className="btn btn-outline btn-sm" onClick={logoutAdmin}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'subscriptions', label: 'Activate Subscriptions' },
          { key: 'users', label: 'Users' },
          { key: 'trainers', label: 'Manage Trainers' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 24px',
              fontFamily: 'Bebas Neue', fontSize: 16, letterSpacing: 2,
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted)',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              textTransform: 'uppercase',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subscriptions tab */}
      {activeTab === 'subscriptions' && (
        <div style={{ maxWidth: 520 }}>
          <div className="card">
            <div className="section-title">Activate User Subscription</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              Once cash payment is received, enter the user's email and select their plan to activate access.
            </div>
            <form onSubmit={handleActivateSub}>
              <div className="form-group">
                <label className="form-label">User Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="user@example.com"
                  value={subEmail}
                  onChange={e => setSubEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Plan</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {PLANS.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSubPlan(p.id)}
                      style={{
                        flex: 1, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${subPlan === p.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: subPlan === p.id ? 'rgba(var(--accent-rgb), 0.08)' : 'var(--black)',
                      }}
                    >
                      <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, letterSpacing: 1, color: subPlan === p.id ? 'var(--accent)' : 'var(--text)' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{p.sessions} sessions · ₹{p.price.toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>
              {subMsg && (
                <div className={subMsg.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginBottom: 12 }}>
                  {subMsg.text}
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={subLoading}>
                {subLoading ? 'Activating...' : 'Activate Subscription'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Users tab */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>All Users ({users.length})</div>
            <button className="btn btn-outline btn-sm" onClick={fetchUsers}>Refresh</button>
          </div>
          {usersLoading ? (
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading users...</div>
          ) : users.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No users found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users.map(u => {
                const activeSub = u.activeSub
                const sessionsLeft = activeSub ? activeSub.total_sessions - activeSub.sessions_used : null
                return (
                  <div key={u.id} className="trainer-row" style={{ alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Bebas Neue', fontSize: 18, color: 'var(--accent)', flexShrink: 0,
                      }}>
                        {(u.full_name || u.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{u.email}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          Joined {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        {activeSub ? (
                          <>
                            <span className="badge badge-confirmed" style={{ marginBottom: 4, display: 'inline-block' }}>
                              {activeSub.plan === 'basic' ? 'Starter' : 'Premium'}
                            </span>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                              {sessionsLeft} sessions left · {activeSub.sessions_used}/{activeSub.total_sessions} used
                            </div>
                          </>
                        ) : (
                          <span className="badge badge-cancelled">No Plan</span>
                        )}
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => handleRemoveUser(u)}>Remove</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Trainers tab */}
      {activeTab === 'trainers' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
          <div className="card">
            <div className="section-title">{editId ? 'Edit Trainer' : 'Add New Trainer'}</div>
            <form onSubmit={handleTrainerSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Arjun Sharma" value={trainerForm.name} onChange={e => setTrainerForm({ ...trainerForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" placeholder="trainer_arjun" value={trainerForm.username} onChange={e => setTrainerForm({ ...trainerForm, username: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" placeholder="Password for trainer login" value={trainerForm.password} onChange={e => setTrainerForm({ ...trainerForm, password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input className="form-input" placeholder="Strength & Conditioning" value={trainerForm.specialization} onChange={e => setTrainerForm({ ...trainerForm, specialization: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Users Per Slot</label>
                <input className="form-input" type="number" min="1" max="50" placeholder="1" value={trainerForm.max_capacity} onChange={e => setTrainerForm({ ...trainerForm, max_capacity: parseInt(e.target.value) || 1 })} required />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {editId ? 'Update Trainer' : 'Add Trainer'}
                </button>
                {editId && (
                  <button type="button" className="btn btn-outline" onClick={() => { setEditId(null); setTrainerForm({ name: '', username: '', password: '', specialization: '', max_capacity: 1 }) }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div>
            <div className="section-title">Trainers ({trainers.length})</div>
            {trainers.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>No trainers yet</div>
            ) : trainers.map(t => (
              <div key={t.id} className="trainer-row">
                <div>
                  <div className="trainer-row-name">{t.name}</div>
                  <div className="trainer-creds">
                    @{t.username} · {showPasswords[t.id] ? t.password : '•'.repeat(t.password.length)}
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginLeft: 6, fontSize: 11 }}
                      onClick={() => togglePassword(t.id)}
                    >
                      {showPasswords[t.id] ? 'hide' : 'show'}
                    </button>
                  </div>
                  {t.specialization && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.specialization}</div>}
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>Max {t.max_capacity || 1} per slot</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => handleEdit(t)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
