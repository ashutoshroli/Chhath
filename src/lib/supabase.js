import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ─── Auth Helpers ────────────────────────────────────────────
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ─── Profile Helpers ─────────────────────────────────────────
export const getProfile = async (userId) => {
  const { data } = await supabase
    .from('profiles')
    .select('*, users(*)')
    .eq('id', userId)
    .single()
  return data
}

// ─── Format Helpers ──────────────────────────────────────────
export const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

export const parseAmt = (v) =>
  parseFloat((v || '').toString().replace(/[^0-9.-]+/g, '')) || 0

// ─── Analytics Session Tracker ───────────────────────────────
export const trackSession = async () => {
  try {
    let sessionId = localStorage.getItem('cp_session_id')
    const isReturning = !!sessionId
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      localStorage.setItem('cp_session_id', sessionId)
    }

    const ua = navigator.userAgent
    const browser = ua.includes('Chrome') ? 'Chrome'
      : ua.includes('Firefox') ? 'Firefox'
      : ua.includes('Safari') ? 'Safari'
      : ua.includes('Edge') ? 'Edge' : 'Other'
    const os = ua.includes('Windows') ? 'Windows'
      : ua.includes('Mac') ? 'macOS'
      : ua.includes('Android') ? 'Android'
      : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS'
      : ua.includes('Linux') ? 'Linux' : 'Other'
    const device = /Mobi|Android/i.test(ua) ? 'Mobile' : 'Desktop'

    // Try to get location via free IP API
    let geo = {}
    try {
      const r = await fetch('https://ipapi.co/json/')
      const d = await r.json()
      geo = {
        ip_address: d.ip,
        country: d.country_name,
        region: d.region,
        city: d.city,
        latitude: d.latitude,
        longitude: d.longitude,
      }
    } catch (_) {}

    await supabase.from('analytics_sessions').upsert({
      session_id: sessionId,
      browser,
      os,
      device_type: device,
      is_returning: isReturning,
      last_seen: new Date().toISOString(),
      page_views: isReturning ? undefined : 1,
      ...geo,
    }, { onConflict: 'session_id', ignoreDuplicates: false })

    if (isReturning) {
      await supabase.rpc('increment_page_views', { sid: sessionId })
    }
  } catch (_) {}
}
