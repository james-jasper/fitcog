import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'
import { format, parseISO } from 'date-fns'

export default function TrainerDashboard() {
  const { trainer, logoutTrainer } = useApp()
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('upcoming')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    // Verify trainer still exists in DB (handles case where admin deleted them)
    supabase
      .from('trainers')
      .select('id')
      .eq('id', trainer.id)
      .limit(1)
      .then(({ data }) => {
        if (!data || data.length === 0) logoutTrainer()
        else fetchBookings()
      })
  }, [trainer])

  const fetchBookings = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('trainer_id', trainer.id)
      .order('booking_date', { ascending: true })
      .order('time_slot', { ascending: true })
    if (data) setBookings(data)
    setLoading(false)
  }

  const acceptBooking = async (booking) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking.id)
    if (!error) {
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'confirmed' } : b))
      showToast('Session accepted!')
    }
  }

  const declineBooking = async (booking) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)
    if (!error) {
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b))
      showToast('Session declined.', 'error')
    }
  }

  const markComplete = async (booking) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', booking.id)
    if (!error) {
      // Deduct session from user's subscription on completion
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', booking.user_id)
        .eq('status', 'active')
        .limit(1)
      if (subs && subs.length > 0) {
        await supabase
          .from('subscriptions')
          .update({ sessions_used: subs[0].sessions_used + 1 })
          .eq('id', subs[0].id)
      }
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed' } : b))
      showToast('Session marked as completed!')
    }
  }

  const cancelBooking = async (booking) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)
    if (!error) {
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b))
      showToast('Booking cancelled.', 'error')
    }
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const filtered = bookings.filter(b => {
    if (filter === 'pending') return b.status === 'pending'
    if (filter === 'upcoming') return b.status === 'confirmed' && b.booking_date >= today
    if (filter === 'today') return b.booking_date === today && b.status === 'confirmed'
    if (filter === 'completed') return b.status === 'completed'
    if (filter === 'all') return true
    return true
  })

  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const todayCount = bookings.filter(b => b.booking_date === today && b.status === 'confirmed').length
  const totalCompleted = bookings.filter(b => b.status === 'completed').length
  const upcomingCount = bookings.filter(b => b.status === 'confirmed' && b.booking_date >= today).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'var(--dark)', borderBottom: '1px solid var(--border)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, letterSpacing: 4, color: 'var(--accent)' }}>FITCOG</div>
          <div style={{ color: 'var(--muted)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Trainer Portal</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{trainer.name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{trainer.specialization}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={logoutTrainer}>Logout</button>
        </div>
      </div>

      <div style={{ padding: '40px' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 48, letterSpacing: 3, marginBottom: 32 }}>
          Your <span style={{ color: 'var(--accent)' }}>Schedule</span>
        </div>

        {/* Stats */}
        <div className="stats-row" style={{ marginBottom: 32 }}>
          <div className="card" style={{ borderColor: pendingCount > 0 ? 'var(--accent)' : undefined }}>
            <div className="card-label">Pending Requests</div>
            <div className="card-value" style={{ color: pendingCount > 0 ? 'var(--accent)' : undefined }}>{pendingCount}</div>
          </div>
          <div className="card card-accent-orange">
            <div className="card-label">Today's Sessions</div>
            <div className="card-value card-value-orange">{todayCount}</div>
          </div>
          <div className="card card-accent-green">
            <div className="card-label">Upcoming</div>
            <div className="card-value card-value-green">{upcomingCount}</div>
          </div>
          <div className="card">
            <div className="card-label">Completed</div>
            <div className="card-value">{totalCompleted}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['pending', 'today', 'upcoming', 'completed', 'all'].map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize', position: 'relative' }}
            >
              {f}{f === 'pending' && pendingCount > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--accent)', color: 'var(--black)', borderRadius: 99, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Bookings */}
        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading bookings...</div>
        ) : filtered.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No Sessions</div>
            <div className="empty-state-text">No sessions in this category</div>
          </div>
        ) : filtered.map(b => (
          <div key={b.id} className="booking-item" style={{ marginBottom: 12 }}>
            <div>
              <div className="booking-trainer">
                {format(parseISO(b.booking_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="booking-time">{b.time_slot}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontFamily: 'monospace' }}>Member ID: {b.user_id.slice(0, 8)}...</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`badge badge-${b.status}`}>{b.status}</span>
              {b.status === 'pending' && (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => acceptBooking(b)}>✓ Accept</button>
                  <button className="btn btn-danger btn-sm" onClick={() => declineBooking(b)}>✗ Decline</button>
                </>
              )}
              {b.status === 'confirmed' && (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => markComplete(b)}>✓ Complete</button>
                  <button className="btn btn-danger btn-sm" onClick={() => cancelBooking(b)}>Cancel</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
