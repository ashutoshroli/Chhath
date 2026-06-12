import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase, signOut, fmt } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
// BUG FIX: Removed unused imports: Home, Receipt, Handshake, Users
// These were imported but never rendered in JSX, causing dead imports.
import { LogOut, Plus, X } from 'lucide-react'

export default function AdminPanel() {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [activeTab, setActiveTab] = useState('home')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ collections: [], expenses: [], users: [] })
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formType, setFormType] = useState('COLLECTION')
  const [formData, setFormData] = useState({ user_id: '', amount: '', description: '' })

  const currentYear = new Date().getFullYear()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [colRes, expRes, usrRes] = await Promise.all([
        supabase.from('collections').select('*').eq('year', currentYear),
        supabase.from('expenses').select('*').eq('year', currentYear),
        supabase.from('users').select('*')
      ])

      setData({
        collections: colRes.data || [],
        expenses: expRes.data || [],
        users: usrRes.data || []
      })
    } catch (error) {
      toast.error('Data fetch karne mein error aayi')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    toast.success('Logged out successfully')
    navigate('/')
  }

  const openForm = (type) => {
    setFormType(type)
    setFormData({ user_id: '', amount: '', description: '' })
    setIsModalOpen(true)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    // Authorization Check: Manager & Admin can insert
    if (!['admin', 'manager', 'super_admin'].includes(role)) {
      return toast.error('Aapko ye action perform karne ki permission nahi hai')
    }

    try {
      if (formType === 'COLLECTION') {
        if (!formData.user_id || !formData.amount) return toast.error('Sabhi fields bharein')
        
        const { error } = await supabase.from('collections').insert([{
          year: currentYear,
          user_id: formData.user_id,
          amount: parseFloat(formData.amount),
          date: new Date().toISOString().split('T')[0]
        }])
        if (error) throw error
        toast.success('Chanda successfully save ho gaya!')
      } 
      else if (formType === 'EXPENSE') {
        if (!formData.description || !formData.amount) return toast.error('Sabhi fields bharein')
        
        const { error } = await supabase.from('expenses').insert([{
          year: currentYear,
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: new Date().toISOString().split('T')[0]
        }])
        if (error) throw error
        toast.success('Kharcha successfully save ho gaya!')
      }

      setIsModalOpen(false)
      fetchDashboardData() // Refresh data

    } catch (error) {
      toast.error(error.message || 'Save karne mein dikkat aayi')
    }
  }

  const getUserName = (id) => {
    const u = data.users.find(usr => usr.id === id)
    return u ? `${u.name} (${u.village})` : 'Unknown'
  }

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>

  const totCol = data.collections.reduce((s, c) => s + Number(c.amount), 0)
  const totExp = data.expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* HEADER */}
      <header style={{ position: 'fixed', top: 0, width: '100%', height: '70px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', boxShadow: 'var(--shadow-sm)', zIndex: 100 }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Admin Panel</h1>
          {/* BUG FIX: role can be null if profile hasn't loaded yet — calling .toUpperCase()
              on null crashes the app with "Cannot read properties of null".
              Use optional chaining and a fallback string. */}
          <span style={{ fontSize: '0.75rem', color: 'var(--saffron)' }}>{(role ?? 'USER').toUpperCase()} • {currentYear}</span>
        </div>
        <button onClick={handleLogout} className="btn btn-danger btn-sm">
          <LogOut size={16} /> Logout
        </button>
      </header>

      {/* MAIN CONTENT */}
      <div className="page-wrap" style={{ marginTop: '90px' }}>
        
        {/* TAB NAVIGATION */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Collections</button>
          <button className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>Expenses</button>
        </div>

        {/* TAB VIEWS */}
        {activeTab === 'home' && (
          <div className="fade-in">
            <div className="card card-dark" style={{ marginBottom: '20px' }}>
              <h2>{currentYear} Collections</h2>
              <div style={{ fontSize: '2rem', color: 'var(--success)', fontWeight: 'bold' }}>+{fmt(totCol)}</div>
            </div>
            <div className="card">
              {data.collections.map(c => (
                <div key={c.id} className="data-row">
                  <div><strong>{getUserName(c.user_id)}</strong></div>
                  <strong style={{ color: 'var(--success)' }}>+{fmt(c.amount)}</strong>
                </div>
              ))}
              {data.collections.length === 0 && <p className="empty">Koi chanda record nahi hai.</p>}
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="fade-in">
            <div className="card card-dark" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)' }}>
              <h2>{currentYear} Expenses</h2>
              <div style={{ fontSize: '2rem', color: '#fca5a5', fontWeight: 'bold' }}>-{fmt(totExp)}</div>
            </div>
            <div className="card">
              {data.expenses.map(e => (
                <div key={e.id} className="data-row">
                  <div><strong>{e.description}</strong></div>
                  <strong style={{ color: 'var(--danger)' }}>-{fmt(e.amount)}</strong>
                </div>
              ))}
              {data.expenses.length === 0 && <p className="empty">Koi kharcha record nahi hai.</p>}
            </div>
          </div>
        )}

      </div>

      {/* FLOATING ACTION BUTTON */}
      <button 
        onClick={() => openForm(activeTab === 'home' ? 'COLLECTION' : 'EXPENSE')}
        style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--saffron)', color: 'white', width: '60px', height: '60px', borderRadius: '50%', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: 'var(--shadow-lg)', cursor: 'pointer', zIndex: 99 }}
      >
        <Plus size={30} />
      </button>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{formType === 'COLLECTION' ? 'Naya Chanda Jodein' : 'Naya Kharcha Jodein'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-icon"><X size={20}/></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleFormSubmit}>
                
                {formType === 'COLLECTION' && (
                  <div className="form-group">
                    <label className="form-label">Contributor Select Karein</label>
                    <select 
                      className="form-select" 
                      value={formData.user_id} 
                      onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                    >
                      <option value="">-- Select --</option>
                      {data.users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.village})</option>
                      ))}
                    </select>
                  </div>
                )}

                {formType === 'EXPENSE' && (
                  <div className="form-group">
                    <label className="form-label">Kharcha Kis Chiz Ka Hua?</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Tent aur Light"
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="0"
                    value={formData.amount} 
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>

                <div className="modal-footer" style={{ padding: '20px 0 0 0' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Data</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}