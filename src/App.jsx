import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import BookSession from './pages/BookSession'
import SubscriptionPage from './pages/SubscriptionPage'
import TrainerDashboard from './pages/TrainerDashboard'
import AdminPage from './pages/AdminPage'
import './App.css'

export const AppContext = createContext(null)
export function useApp() { return useContext(AppContext) }

function App() {
  const [user, setUser] = useState(null)
  const [trainer, setTrainer] = useState(null)
  const [admin, setAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    const savedTrainer = sessionStorage.getItem('fitcog_trainer')
    if (savedTrainer) setTrainer(JSON.parse(savedTrainer))
    const savedAdmin = sessionStorage.getItem('fitcog_admin')
    if (savedAdmin) setAdmin(true)
    return () => subscription.unsubscribe()
  }, [])

  const logoutTrainer = () => {
    sessionStorage.removeItem('fitcog_trainer')
    setTrainer(null)
  }

  const logoutAdmin = () => {
    sessionStorage.removeItem('fitcog_admin')
    setAdmin(false)
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">FITCOG</div>
      <div className="loading-bar"><div className="loading-fill" /></div>
    </div>
  )

  const isLoggedIn = user || trainer || admin
  const defaultRedirect = user ? '/dashboard' : trainer ? '/trainer' : '/admin'

  return (
    <AppContext.Provider value={{ user, setUser, trainer, setTrainer, logoutTrainer, admin, setAdmin, logoutAdmin }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={isLoggedIn ? <Navigate to={defaultRedirect} /> : <AuthPage />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
          <Route path="/book" element={user ? <BookSession /> : <Navigate to="/" />} />
          <Route path="/subscription" element={user ? <SubscriptionPage /> : <Navigate to="/" />} />
          <Route path="/trainer" element={trainer ? <TrainerDashboard /> : <Navigate to="/" />} />
          <Route path="/admin" element={admin ? <AdminPage /> : <Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  )
}

export default App
