import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import BookSession from './pages/BookSession'
import SubscriptionPage from './pages/SubscriptionPage'
import TrainerLogin from './pages/TrainerLogin'
import TrainerDashboard from './pages/TrainerDashboard'
import AdminPage from './pages/AdminPage'
import './App.css'

export const AppContext = createContext(null)
export function useApp() { return useContext(AppContext) }

function App() {
  const [user, setUser] = useState(null)
  const [trainer, setTrainer] = useState(null)
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
    return () => subscription.unsubscribe()
  }, [])

  const logoutTrainer = () => {
    sessionStorage.removeItem('fitcog_trainer')
    setTrainer(null)
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">FITCOG</div>
      <div className="loading-bar"><div className="loading-fill" /></div>
    </div>
  )

  return (
    <AppContext.Provider value={{ user, setUser, trainer, setTrainer, logoutTrainer }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
          <Route path="/book" element={user ? <BookSession /> : <Navigate to="/" />} />
          <Route path="/subscription" element={user ? <SubscriptionPage /> : <Navigate to="/" />} />
          <Route path="/trainer" element={trainer ? <TrainerDashboard /> : <TrainerLogin />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  )
}

export default App
