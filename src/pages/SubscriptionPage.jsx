import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'
import Sidebar from '../components/Sidebar'
import { format } from 'date-fns'

const PLANS = [
  {
    id: 'basic',
    name: 'Starter',
    price: 8000,
    sessions: 12,
    features: ['12 training sessions', 'Access to all trainers', 'Session streak tracking', 'Booking up to 14 days ahead'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 16000,
    sessions: 30,
    popular: true,
    features: ['30 training sessions', 'Access to all trainers', 'Session streak tracking', 'Priority slot access', 'Best value per session'],
  }
]

export default function SubscriptionPage() {
  const { user } = useApp()
  const [activeSub, setActiveSub] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [allSubs, setAllSubs] = useState([])

  useEffect(() => { fetchSubs() }, [user])

  const fetchSubs = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) {
      setAllSubs(data)
      const active = data.find(s => s.status === 'active')
      setActiveSub(active || null)
    }
  }

  const sessionsLeft = activeSub ? activeSub.total_sessions - activeSub.sessions_used : 0
  const progressPct = activeSub ? (activeSub.sessions_used / activeSub.total_sessions) * 100 : 0

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div className="page-title">Your <span>Plan</span></div>
          <div className="page-subtitle">Choose a subscription to start booking sessions</div>
        </div>

        {/* Active subscription status */}
        {activeSub && (
          <div className="card card-accent-green" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="card-label">Active Plan</div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 36, letterSpacing: 2, color: 'var(--accent)' }}>
                {activeSub.plan === 'basic' ? 'Starter' : 'Premium'}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                Started {format(new Date(activeSub.created_at), 'MMMM d, yyyy')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: 52, color: 'var(--accent)', lineHeight: 1 }}>{sessionsLeft}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>Sessions Left</div>
            </div>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                <span>{activeSub.sessions_used} used</span>
                <span>{activeSub.total_sessions} total</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div style={{ marginBottom: 12, fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 2, color: 'var(--muted)' }}>
          {activeSub ? 'Upgrade or Renew' : 'Choose a Plan'}
        </div>
        <div className="grid-2" style={{ marginBottom: 32 }}>
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''}`}
              onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
            >
              {plan.popular && <div className="plan-popular">Most Popular</div>}
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price">
                ₹{plan.price.toLocaleString('en-IN')}
                <span> / plan</span>
              </div>
              <div className="plan-sessions">{plan.sessions} sessions · ₹{Math.round(plan.price / plan.sessions)}/session</div>
              {plan.features.map(f => <div key={f} className="plan-feature">{f}</div>)}
            </div>
          ))}
        </div>

        {/* How to activate */}
        {selectedPlan && (
          <div className="card" style={{ maxWidth: 480, borderColor: 'var(--accent)', borderWidth: 1, borderStyle: 'solid' }}>
            <div className="card-label">How to Activate</div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                <span>{PLANS.find(p => p.id === selectedPlan).name} Plan</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>₹{PLANS.find(p => p.id === selectedPlan).price.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                <div style={{ marginBottom: 8 }}>1. Pay <strong style={{ color: 'var(--text)' }}>₹{PLANS.find(p => p.id === selectedPlan).price.toLocaleString('en-IN')}</strong> in cash at the gym counter.</div>
                <div style={{ marginBottom: 8 }}>2. Share your registered email with the staff:</div>
                <div style={{ background: 'var(--black)', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)', marginBottom: 8 }}>
                  {user.email}
                </div>
                <div>3. The admin will activate your plan — you'll see sessions available right here.</div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {allSubs.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div className="section-title">Subscription History</div>
            {allSubs.map(s => (
              <div key={s.id} className="booking-item">
                <div>
                  <div className="booking-trainer">{s.plan === 'basic' ? 'Starter' : 'Premium'} Plan</div>
                  <div className="booking-time">{format(new Date(s.created_at), 'MMM d, yyyy')} · {s.total_sessions} sessions · ₹{s.amount.toLocaleString('en-IN')}</div>
                </div>
                <span className={`badge ${s.status === 'active' ? 'badge-confirmed' : 'badge-completed'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
