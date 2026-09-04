import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadRole = useCallback(async (userId) => {
    if (!userId) {
      setRole(null)
      return
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()

    setRole(data?.role || null)
  }, [])

  useEffect(() => {
    let active = true

    const boot = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      const nextUser = data.session?.user ?? null
      setUser(nextUser)
      if (nextUser) await loadRole(nextUser.id)
      setLoading(false)
    }

    boot()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)
        if (nextUser) await loadRole(nextUser.id)
        else setRole(null)
        setLoading(false)
      },
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadRole])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    user,
    role,
    isAdmin: role === 'admin',
    loading,
    signOut,
  }
}
