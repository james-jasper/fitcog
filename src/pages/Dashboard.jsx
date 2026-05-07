import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useApp } from '../App'
import Sidebar from '../components/Sidebar'
import { format } from 'date-fns'

export default function Dashboard() {
  const { user } = useApp()
  const navigate = useNavigate()
  const [sub, setSub] = useState(null)
  const [bookings, setBookings] = useState([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  // Define fetchData before useEffect so closures always get the correct reference
  const fetchData = useCallback(async () => {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
    setSub(subs?.[0] || null)

    const { data: bk } = await supabase
      .from('bookings')
      .select('*, trainers(name, specialization)')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false })
    if (bk) {
      setBookings(bk)
      const completed = bk
        .filter(b => b.status === 'completed')
        .map(b => b.booking_date)
        .sort()
        .reverse()
      let s = 0
      const today = new Date()
      for (let i = 0; i < completed.length; i++) {
        const diff = Math.floor((today - new Date(completed[i])) / (1000 * 60 * 60 * 24))
        if (diff === i || diff === i + 1) s++
        else break
      }
      setStreak(s)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()

    // Refetch when user tabs back
    window.addEventListener('focus', fetchData)

    // Poll every 5 seconds — catches trainer accept/decline/complete
    const poll = setInterval(fetchData, 5000)

    // Supabase realtime (if enabled in Supabase dashboard → Database → Replication)
    const bookingChannel = supabase
      .channel('user-bookings-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: `user_id=eq.${user.id}`,
      }, fetchData)
      .subscribe()

    const subChannel = supabase
      .channel('user-subscription-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'subscriptions',
        filter: `user_id=eq.${user.id}`,
      }, fetchData)
      .subscribe()

    return () => {
      window.removeEventListener('focus', fetchData)
      clearInterval(poll)
      supabase.removeChannel(bookingChannel)
      supabase.removeChannel(subChannel)
    }
  }, [fetchData])

  const sessionsRemaining = sub ? sub.total_sessions - sub.sessions_used : 0
  const sessionsUsed = sub ? sub.sessions_used : 0
  const totalSessions = sub ? sub.total_sessions : 0
  const progressPct = totalSessions > 0 ? (sessionsUsed / totalSessions) * 100 : 0

  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const completedBookings = bookings.filter(b => b.status === 'completed')
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled')

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Athlete'

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div className="page-title">Hey, <span>{userName.split(' ')[0]}</span> 💪</div>
          <div className="page-subtitle">{format(new Date(), 'EEEE, MMMM d yyyy')} — Let's get to work.</div>
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading your data...</div>
        ) : !sub ? (
          <div className="card empty-state">
            <div className="empty-state-icon">🏋️</div>
            <div className="empty-state-title">No Active Subscription</div>
            <div className="empty-state-text">Subscribe to start booking sessions with our trainers</div>
            <button className="btn btn-primary" onClick={() => navigate('/subscription')}>View Plans →</button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="stats-row">
              <div className="card card-accent-green">
                <div className="card-label">Sessions Left</div>
                <div className="card-value card-value-green">{sessionsRemaining}</div>
                <div className="progress-wrap">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${100 - progressPct}%` }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{sessionsUsed} of {totalSessions} used</div>
                </div>
              </div>
              <div className="card">
                <div className="card-label">Sessions Used</div>
                <div className="card-value">{sessionsUsed}</div>
              </div>
              <div className="card card-accent-orange">
                <div className="card-label">🔥 Streak</div>
                <div className="streak-number">{streak}</div>
                <div className="streak-label">day{streak !== 1 ? 's' : ''} in a row</div>
              </div>
              <div className="card">
                <div className="card-label">Plan</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: 2, marginTop: 4, color: 'var(--accent)' }}>
                  {sub.plan === 'basic' ? 'Basic' : 'Premium'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                  {sub.plan === 'basic' ? '12 sessions' : '30 sessions'}
                </div>
              </div>
            </div>

            {/* Pending — always show this section so user knows to wait */}
            <div style={{ marginBottom: 28 }}>
              <div className="section-title" style={{ color: '#ffb400' }}>
                Awaiting Trainer Confirmation {pendingBookings.length > 0 && `(${pendingBookings.length})`}
              </div>
              {pendingBookings.length === 0 ? (
                <div className="card" style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: 13 }}>
                  No pending requests
                </div>
              ) : pendingBookings.map(b => (
                <div key={b.id} className="booking-item">
                  <div>
                    <div className="booking-trainer">{b.trainers?.name || 'Trainer'}</div>
                    <div className="booking-time">{format(new Date(b.booking_date + 'T00:00:00'), 'EEE, MMM d')} · {b.time_slot}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{b.trainers?.specialization}</div>
                  </div>
                  <span className="badge badge-pending">Pending</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Confirmed upcoming */}
              <div>
                <div className="section-title">Upcoming Sessions</div>
                {confirmedBookings.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
                    <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>No confirmed sessions</div>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/book')}>Book Now</button>
                  </div>
                ) : confirmedBookings.map(b => (
                  <div key={b.id} className="booking-item">
                    <div>
                      <div className="booking-trainer">{b.trainers?.name || 'Trainer'}</div>
                      <div className="booking-time">{format(new Date(b.booking_date + 'T00:00:00'), 'EEE, MMM d')} · {b.time_slot}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{b.trainers?.specialization}</div>
                    </div>
                    <span className="badge badge-confirmed">Confirmed</span>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/book')}>+ Book Session</button>
              </div>

              {/* History: completed + declined */}
              <div>
                <div className="section-title">Session History</div>
                {completedBookings.length === 0 && cancelledBookings.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)', fontSize: 14 }}>
                    No past sessions yet
                  </div>
                ) : (
                  <>
                    {completedBookings.slice(0, 5).map(b => (
                      <div key={b.id} className="booking-item">
                        <div>
                          <div className="booking-trainer">{b.trainers?.name || 'Trainer'}</div>
                          <div className="booking-time">{format(new Date(b.booking_date + 'T00:00:00'), 'EEE, MMM d')} · {b.time_slot}</div>
                        </div>
                        <span className="badge badge-completed">Completed</span>
                      </div>
                    ))}
                    {cancelledBookings.slice(0, 3).map(b => (
                      <div key={b.id} className="booking-item">
                        <div>
                          <div className="booking-trainer">{b.trainers?.name || 'Trainer'}</div>
                          <div className="booking-time">{format(new Date(b.booking_date + 'T00:00:00'), 'EEE, MMM d')} · {b.time_slot}</div>
                        </div>
                        <span className="badge badge-cancelled">Declined</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
