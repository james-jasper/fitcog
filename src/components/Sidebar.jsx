import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../App'
import { supabase } from '../supabase'

const HomeIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const CalIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const CardIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
const LogoutIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useApp()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <HomeIcon /> },
    { path: '/book', label: 'Book Session', icon: <CalIcon /> },
    { path: '/subscription', label: 'Subscription', icon: <CardIcon /> },
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        FITCOG
        <span>Member Portal</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-user">{user?.email}</div>
        <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
          <LogoutIcon />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </div>
  )
}
