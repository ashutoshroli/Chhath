import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, fmt, trackSession } from '../lib/supabase'
// BUG FIX: Removed unused imports ReceiptIndianRupee and Users.
// They were imported but never rendered in JSX.
import { Sun, LogIn, Search } from 'lucide-react'

export default function PublicPortal() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState('All')
  const [availableYears, setAvailableYears] = useState([])
  const [search, setSearch] = useState('')
  
  const [data, setData] = useState({
    collections: [],
    expenses: [],
    users: [],
    committee: []
  })

  useEffect(() => {
    trackSession() // Live tracking trigger
    fetchPublicData()
  }, [])

  const fetchPublicData = async () => {
    try {
      const [colRes, expRes, usrRes, comRes] = await Promise.all([
        supabase.from('collections').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('users').select('*'),
        supabase.from('committee_members').select('*')
      ])

      setData({
        collections: colRes.data || [],
        expenses: expRes.data || [],
        users: usrRes.data || [],
        committee: comRes.data || []
      })

      // Years filter extract karna
      const yearsSet = new Set()
      ;(colRes.data || []).forEach(c => yearsSet.add(c.year))
      ;(expRes.data || []).forEach(e => yearsSet.add(e.year))
      const yearsArr = Array.from(yearsSet).sort((a, b) => b - a)
      if (yearsArr.length > 0) {
        setAvailableYears(yearsArr)
        setYear(yearsArr[0].toString())
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Data loading failed:', error)
      setLoading(false)
    }
  }

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>

  // Data filtering logic based on selected year
  const isAll = year === 'All'
  const targetYear = isAll ? 'All' : parseInt(year)

  const curCol = isAll ? data.collections : data.collections.filter(c => c.year === targetYear)
  const totCol = curCol.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  const curExp = isAll ? data.expenses : data.expenses.filter(e => e.year === targetYear)
  const totExp = curExp.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

  const pastRet = 0 
  const totBudget = totCol + pastRet
  const surplus = totBudget - totExp

  const filteredCollections = curCol.filter(c => {
    if (!search) return true
    const user = data.users.find(u => u.id === c.user_id)
    return user?.name?.toLowerCase().includes(search.toLowerCase())
  })

  const getUserName = (id) => {
    const user = data.users.find(u => u.id === id)
    return user ? `${user.name} (${user.village})` : 'Unknown'
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* HEADER */}
      <header style={{ position: 'fixed', top: 0, width: '100%', height: '70px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', boxShadow: 'var(--shadow-sm)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sun style={{ color: 'var(--saffron)' }} size={28} />
          <div>
            <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Chhath Puja</h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Transparency Portal</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={year} 
            onChange={(e) => setYear(e.target.value)}
            style={{ background: 'var(--saffron)', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold', outline: 'none' }}
          >
            <option value="All">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => navigate('/login')} className="btn btn-secondary hide-mobile">
            <LogIn size={18} /> Admin Login
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="page-wrap" style={{ marginTop: '90px' }}>
        
        {/* BUDGET CARD */}
        <div className="card card-dark" style={{ marginBottom: '20px' }}>
          <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginBottom: '5px' }}>Master Financial Calculation</p>
          <h2 style={{ marginBottom: '15px' }}>{isAll ? 'Lifetime' : year} Budget Overview</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>(+) Current Year Collection</span>
            <strong style={{ color: 'var(--success)' }}>{fmt(totCol)}</strong>
          </div>
          
          <div style={{ borderTop: '1px dashed #4B5563', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>TOTAL BUDGET</span>
            <strong style={{ fontSize: '1.5rem', color: 'var(--saffron)' }}>{fmt(totBudget)}</strong>
          </div>
        </div>

        {/* STATS */}
        <div className="grid-2" style={{ marginBottom: '20px' }}>
          <div className="stat-box" style={{ borderLeft: '4px solid var(--danger)' }}>
            <div className="stat-box-lbl">Total Expense</div>
            <div className="stat-box-val" style={{ color: 'var(--danger)' }}>{fmt(totExp)}</div>
          </div>
          <div className="stat-box" style={{ borderLeft: '4px solid var(--success)' }}>
            <div className="stat-box-lbl">Net Surplus (Bachat)</div>
            <div className="stat-box-val" style={{ color: 'var(--success)' }}>{fmt(surplus)}</div>
          </div>
        </div>

        {/* CONTRIBUTORS LIST */}
        <h3 style={{ marginBottom: '15px' }}>Contributors List</h3>
        <div className="search-wrap">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            className="search-bar" 
            placeholder="Search contributor by name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="card" style={{ marginBottom: '20px' }}>
          {filteredCollections.length === 0 ? <p className="empty">No records found.</p> : 
            filteredCollections.map(c => (
              <div key={c.id} className="data-row">
                <div>
                  <strong>{getUserName(c.user_id)}</strong>
                  {isAll && <span className="badge badge-saffron" style={{ marginLeft: '5px' }}>{c.year}</span>}
                </div>
                <strong style={{ color: 'var(--success)' }}>+{fmt(c.amount)}</strong>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}