import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../App'
import Sidebar from '../components/Sidebar'
import { format, addDays, isBefore, parseISO } from 'date-fns'

const TIME_SLOTS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM',
  '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM',
]

// Parse time string to minutes since midnight
function parseTimeToMinutes(timeStr) {
  const [time, period] = timeStr.split(' ')
  let [hours, mins] = time.split(':').map(Number)
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return hours * 60 + (mins || 0)
}

export default function BookSession() {
  const { user } = useApp()
  const [trainers, setTrainers] = useState([])
  const [selectedTrainer, setSelectedTrainer] = useState(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [takenSlots, setTakenSlots] = useState([])
  const [slotCounts, setSlotCounts] = useState({})
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetchTrainers()
    fetchSubscription()
  }, [user])

  useEffect(() => {
    if (selectedTrainer && selectedDate) fetchTakenSlots()
  }, [selectedTrainer, selectedDate])

  const fetchTrainers = async () => {
    const { data } = await supabase.from('trainers').select('*')
    if (data) setTrainers(data)
  }

  const fetchSubscription = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data.length > 0) setSub(data[0])
  }

  const fetchTakenSlots = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('time_slot')
      .eq('trainer_id', selectedTrainer.id)
      .eq('booking_date', selectedDate)
      .neq('status', 'cancelled')
    if (data) {
      const counts = {}
      data.forEach(b => { counts[b.time_slot] = (counts[b.time_slot] || 0) + 1 })
      const capacity = selectedTrainer.max_capacity || 1
      setSlotCounts(counts)
      setTakenSlots(Object.keys(counts).filter(s => counts[s] >= capacity))
    }
  }

  const isSlotDisabled = (slot) => {
    const today = format(new Date(), 'yyyy-MM-dd')
    if (selectedDate !== today) return false

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const slotMinutes = parseTimeToMinutes(slot)

    // Cannot book if less than 30 minutes before the slot
    return currentMinutes >= slotMinutes - 30
  }

  const handleBook = async () => {
    if (!selectedTrainer || !selectedDate || !selectedSlot) return
    if (!sub) { showToast('You need an active subscription to book sessions', 'error'); return }
    if (sub.sessions_used >= sub.total_sessions) { showToast('No sessions remaining in your subscription', 'error'); return }
    if (isSlotDisabled(selectedSlot)) { showToast('Cannot book this slot — must book at least 30 mins before', 'error'); return }

    setLoading(true)
    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      trainer_id: selectedTrainer.id,
      booking_date: selectedDate,
      time_slot: selectedSlot,
      status: 'pending'
    })

    if (error) {
      showToast(error.message.includes('unique') ? 'This slot is already taken' : error.message, 'error')
    } else {
      showToast(`Request sent to ${selectedTrainer.name} for ${format(parseISO(selectedDate), 'MMM d')} at ${selectedSlot}. Waiting for trainer to accept.`)
      setSelectedSlot(null)
      fetchTakenSlots()
    }
    setLoading(false)
  }

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i)
    return { value: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE'), day: format(d, 'd'), month: format(d, 'MMM') }
  })

  const sessionsLeft = sub ? sub.total_sessions - sub.sessions_used : 0

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <div className="page-title">Book a <span>Session</span></div>
          <div className="page-subtitle">
            {sub ? `${sessionsLeft} session${sessionsLeft !== 1 ? 's' : ''} remaining in your plan` : 'Subscribe first to book sessions'}
          </div>
        </div>

        {!sub ? (
          <div className="card empty-state">
            <div className="empty-state-icon">🔒</div>
            <div className="empty-state-title">Subscription Required</div>
            <div className="empty-state-text">You need an active subscription to book sessions</div>
            <a href="/subscription"><button className="btn btn-primary">View Plans</button></a>
          </div>
        ) : sessionsLeft === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No Sessions Left</div>
            <div className="empty-state-text">You've used all sessions in your current plan</div>
            <a href="/subscription"><button className="btn btn-primary">Renew Plan</button></a>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24 }}>
            {/* Left column */}
            <div style={{ flex: 1 }}>
              {/* Trainer selection */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="section-title">Choose Trainer</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {trainers.map(t => (
                    <div
                      key={t.id}
                      className={`trainer-card ${selectedTrainer?.id === t.id ? 'selected' : ''}`}
                      onClick={() => { setSelectedTrainer(t); setSelectedSlot(null) }}
                    >
                      <div className="trainer-avatar">{t.name[0]}</div>
                      <div className="trainer-info">
                        <div className="trainer-name">{t.name}</div>
                        <div className="trainer-spec">{t.specialization}</div>
                      </div>
                      {selectedTrainer?.id === t.id && <span style={{ color: 'var(--accent)', fontSize: 18 }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Date selection */}
              <div className="card">
                <div className="section-title">Pick a Date</div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {dates.map(d => (
                    <div
                      key={d.value}
                      onClick={() => { setSelectedDate(d.value); setSelectedSlot(null) }}
                      style={{
                        minWidth: 56,
                        padding: '10px 8px',
                        textAlign: 'center',
                        border: `1px solid ${selectedDate === d.value ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: selectedDate === d.value ? 'var(--accent-dim)' : 'var(--dark)',
                        transition: 'all 0.2s',
                        flexShrink: 0
                      }}
                    >
                      <div style={{ fontSize: 11, color: selectedDate === d.value ? 'var(--accent)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{d.label}</div>
                      <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, color: selectedDate === d.value ? 'var(--accent)' : 'var(--text)', marginTop: 2 }}>{d.day}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{d.month}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column - Time slots */}
            <div style={{ width: 360 }}>
              <div className="card" style={{ height: 'fit-content' }}>
                <div className="section-title">Select Time Slot</div>
                {!selectedTrainer ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Select a trainer first</div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                      ⏰ Slots grayed out cannot be booked (must book 30+ mins before session)
                    </div>
                    <div className="slots-grid">
                      {TIME_SLOTS.map(slot => {
                        const taken = takenSlots.includes(slot)
                        const disabled = isSlotDisabled(slot)
                        const capacity = selectedTrainer?.max_capacity || 1
                        const booked = slotCounts[slot] || 0
                        const spotsLeft = capacity - booked
                        return (
                          <div
                            key={slot}
                            className={`slot ${selectedSlot === slot ? 'selected' : ''} ${taken ? 'slot-taken' : ''} ${(!taken && disabled) ? 'slot-disabled' : ''}`}
                            onClick={() => {
                              if (!taken && !disabled) setSelectedSlot(slot)
                            }}
                          >
                            {slot}
                            {taken
                              ? <div style={{ fontSize: 9, marginTop: 2, letterSpacing: 0.5 }}>FULL</div>
                              : booked > 0 && <div style={{ fontSize: 9, marginTop: 2, letterSpacing: 0.5 }}>{spotsLeft} left</div>
                            }
                          </div>
                        )
                      })}
                    </div>

                    {selectedSlot && (
                      <div style={{ marginTop: 20, padding: 16, background: 'var(--accent-dim)', border: '1px solid rgba(200,241,53,0.3)', borderRadius: 10 }}>
                        <div style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 4, fontWeight: 600 }}>Booking Summary</div>
                        <div style={{ fontSize: 13, color: 'var(--text)' }}>Trainer: {selectedTrainer.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text)' }}>Date: {format(parseISO(selectedDate), 'EEEE, MMMM d')}</div>
                        <div style={{ fontSize: 13, color: 'var(--text)' }}>Time: {selectedSlot}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Sessions left after: {sessionsLeft - 1}</div>
                      </div>
                    )}

                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
                      disabled={!selectedSlot || loading}
                      onClick={handleBook}
                    >
                      {loading ? 'Booking...' : 'Confirm Booking'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
