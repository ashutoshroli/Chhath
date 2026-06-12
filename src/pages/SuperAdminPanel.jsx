import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase, signOut } from '../lib/supabase'
import { Activity, ShieldAlert, MessageCircle, LogOut, Plus, Trash2, Globe, Laptop, Smartphone } from 'lucide-react'

export default function SuperAdminPanel() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('analytics')
  
  // States
  const [liveUsers, setLiveUsers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [templates, setTemplates] = useState([])
  const [newTemplate, setNewTemplate] = useState('')

  useEffect(() => {
    fetchData()
    
    // 🔴 REALTIME SUBSCRIPTION: Live Users track karne ke liye
    const subscription = supabase
      .channel('public:analytics_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analytics_sessions' }, () => {
        fetchLiveUsers() // Jab bhi koi naya user aaye, data refresh karo
      })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const fetchData = async () => {
    await Promise.all([fetchLiveUsers(), fetchAuditLogs(), fetchTemplates()])
  }

  // 1. Fetch Live Users (Jo pichle 15 minute me active the)
  const fetchLiveUsers = async () => {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString()
    const { data } = await supabase
      .from('analytics_sessions')
      .select('*')
      .gte('last_seen', fifteenMinsAgo)
      .order('last_seen', { ascending: false })
    if (data) setLiveUsers(data)
  }

  // 2. Fetch Audit Logs
  const fetchAuditLogs = async () => {
    // Assuming table name is audit_logs as per your schema guide
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setAuditLogs(data)
  }

  // 3. Fetch WhatsApp Templates
  const fetchTemplates = async () => {
    const { data } = await supabase.from('wa_templates').select('*')
    if (data) setTemplates(data)
  }

  const handleAddTemplate = async (e) => {
    e.preventDefault()
    if (!newTemplate.trim()) return toast.error('Template khali nahi ho sakta')
    
    const { error } = await supabase.from('wa_templates').insert([{ message_text: newTemplate }])
    if (error) {
      toast.error('Template save karne me error')
    } else {
      toast.success('Naya template add ho gaya!')
      setNewTemplate('')
      fetchTemplates()
    }
  }

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Kya aap is template ko delete karna chahte hain?')) return
    const { error } = await supabase.from('wa_templates').delete().eq('id', id)
    if (!error) {
      toast.success('Template deleted')
      fetchTemplates()
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* HEADER */}
      <header style={{ position: 'fixed', top: 0, width: '100%', height: '70px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', boxShadow: 'var(--shadow-sm)', zIndex: 100 }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--danger)' }}>Super Admin</h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Master Control Panel</span>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>
          <LogOut size={16} /> Logout
        </button>
      </header>

      <div className="page-wrap" style={{ marginTop: '90px' }}>
        
        {/* TAB NAVIGATION */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <Activity size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }}/> Live Traffic
          </button>
          <button className={`tab ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setActiveTab('whatsapp')}>
            <MessageCircle size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }}/> WhatsApp
          </button>
          <button className={`tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
            <ShieldAlert size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }}/> Logs
          </button>
        </div>

        {/* TAB 1: LIVE ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="fade-in">
            <div className="card card-dark" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)' }}>
              <p style={{ color: '#93c5fd', fontSize: '0.9rem' }}>Current Active Users (Last 15 Mins)</p>
              <h2 style={{ fontSize: '2.5rem', color: '#60a5fa' }}>{liveUsers.length}</h2>
            </div>
            
            <h3 style={{ marginBottom: '15px' }}>Visitor Details</h3>
            <div className="grid-2">
              {liveUsers.length === 0 ? <p className="empty">Koi active user nahi hai.</p> : liveUsers.map(u => (
                <div key={u.session_id} className="card" style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{u.city || 'Unknown City'}, {u.region}</strong>
                    <span className="badge badge-info">{u.is_returning ? 'Returning' : 'New'}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Globe size={14}/> {u.ip_address}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Laptop size={14}/> {u.browser} / {u.os}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Smartphone size={14}/> {u.device_type}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '10px', color: '#9ca3af' }}>
                    Last Seen: {new Date(u.last_seen).toLocaleTimeString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: WHATSAPP MANAGEMENT */}
        {activeTab === 'whatsapp' && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #25D366' }}>
              <h3>WhatsApp Node Server Status</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '5px' }}>
                Server URL: {import.meta.env.VITE_WA_SERVER_URL || 'Not Configured'}
              </p>
              <button className="btn btn-primary btn-sm" style={{ background: '#25D366', marginTop: '10px' }}>
                View QR Code / Connect
              </button>
            </div>

            <h3>Message Templates</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '15px' }}>
              System inme se koi ek template randomly choose karega contributor ko message bhejte waqt. (Use [NAME] and [AMOUNT] as variables).
            </p>

            <form onSubmit={handleAddTemplate} className="card" style={{ marginBottom: '20px', background: 'var(--bg)' }}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <textarea 
                  className="form-textarea" 
                  placeholder="e.g. Namaste [NAME] ji, Chhath Puja me aapke [AMOUNT] rupaye ke yogdaan ke liye dhanyawad."
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm"><Plus size={16}/> Add Template</button>
            </form>

            <div>
              {templates.length === 0 ? <p className="empty">Koi template nahi hai.</p> : templates.map(t => (
                <div key={t.id} className="data-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.9rem', paddingRight: '15px' }}>{t.message_text}</div>
                  <button onClick={() => handleDeleteTemplate(t.id)} className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }}>
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="fade-in">
            <h3>System Activity Logs</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '15px' }}>Kisne database me kya badlaaw kiye hain.</p>
            
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Table</th>
                      <th>Record ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? <tr><td colSpan="4" className="empty">No logs available</td></tr> : auditLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`badge ${log.action === 'INSERT' ? 'badge-success' : log.action === 'UPDATE' ? 'badge-warning' : 'badge-danger'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{log.table_name}</td>
                        <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{log.record_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
