import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { signIn } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { user, role, loading, loadProfile } = useAuth()

  // Agar pehle se login hai toh redirect karo
  // loading check zaroori hai — warna role=null pe galat redirect hoga
  if (!loading && user) {
    if (role === 'super_admin') return <Navigate to="/superadmin" replace />
    return <Navigate to="/admin" replace />
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Email aur password dono daalein')

    setIsSubmitting(true)
    const { data, error } = await signIn(email, password)

    if (error) {
      toast.error('Galat Email ya Password')
      setIsSubmitting(false)
      return
    }

    if (data.user) {
      // loadProfile se role milega, phir navigate karo
      const profile = await loadProfile(data.user)
      toast.success('Login Successful!')
      navigate(profile?.role === 'super_admin' ? '/superadmin' : '/admin', { replace: true })
    }

    setIsSubmitting(false)
  }

  return (
    <div className="page-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>

      <button onClick={() => navigate('/')} className="btn btn-ghost" style={{ alignSelf: 'flex-start', marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Public Portal par wapas jayein
      </button>

      <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
          <div style={{ background: 'var(--saffron-light)', padding: '15px', borderRadius: '50%', color: 'var(--saffron)' }}>
            <ShieldCheck size={40} />
          </div>
        </div>

        <h2 style={{ marginBottom: '5px' }}>Committee Login</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '25px' }}>
          Sirf authorized members ke liye
        </p>

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label">Email ID</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
