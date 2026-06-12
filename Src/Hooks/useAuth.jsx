import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // Track whether initial session check is done
  const initializedRef = useRef(false)

  const loadProfile = async (authUser) => {
    if (!authUser) {
      setUser(null)
      setProfile(null)
      return null
    }
    setUser(authUser)
    try {
      const p = await getProfile(authUser.id)
      setProfile(p)
      return p
    } catch (e) {
      console.error('Profile fetch error:', e)
      setProfile(null)
      return null
    }
  }

  useEffect(() => {
    // Step 1: onAuthStateChange ko PEHLE register karo
    // Yeh login/logout events handle karega
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!initializedRef.current) {
        // Initial getSession se pehle fire hota hai — ignore karo,
        // getSession wala block khud handle karega
        return
      }
      // Baad ke events (login, logout, token refresh) ke liye
      // loading set mat karo — sirf profile update karo silently
      loadProfile(session?.user ?? null)
    })

    // Step 2: Existing session check karo — yahi "source of truth" hai startup pe
    supabase.auth.getSession().then(({ data: { session } }) => {
      initializedRef.current = true
      loadProfile(session?.user ?? null).finally(() => setLoading(false))
    })

    return () => subscription.unsubscribe()
  }, [])

  const role = profile?.role ?? null

  return (
    <AuthCtx.Provider value={{ user, profile, role, loading, loadProfile }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)

export const isSuperAdmin = (r) => r === 'super_admin'
export const isAdmin      = (r) => r === 'admin' || r === 'super_admin'
export const isManager    = (r) => ['manager','admin','super_admin'].includes(r)
