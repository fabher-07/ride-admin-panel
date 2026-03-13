import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/router'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Get user details from users table
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (userData && userData.user_type === 'admin') {
            setUser(userData)
          } else {
            // Not an admin, sign out
            await supabase.auth.signOut()
            setUser(null)
          }
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes (only handle sign out - sign in is handled by signIn function)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push('/login')
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [router])

  const signIn = async (email, password) => {
    try {
      // First, sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Wait a bit for auth to settle
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if user exists in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (!userData) {
        await supabase.auth.signOut()
        throw new Error('Usuario no encontrado en la base de datos. Contacta al administrador.')
      }

      if (userData.user_type !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('No tienes permisos de administrador')
      }

      // Log audit (don't wait for it)
      supabase.from('audit_logs').insert({
        user_id: userData.id,
        user_email: userData.email,
        action: 'Inicio de sesión',
        details: 'Admin login exitoso',
        category: 'auth',
        ip_address: 'N/A',
      }).then()

      setUser(userData)
      return { data: authData, error: null }
    } catch (error) {
      console.error('Login error:', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      if (user) {
        // Log audit (don't block signout if this fails)
        supabase.from('audit_logs').insert({
          user_id: user.id,
          user_email: user.email,
          action: 'Cierre de sesión',
          details: 'Admin logout',
          category: 'auth',
          ip_address: 'N/A',
        }).then()
      }

      await supabase.auth.signOut()
      setUser(null)
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      // Force logout even on error
      setUser(null)
      router.push('/login')
    }
  }

  /**
   * MFA: Check if user has MFA enrolled
   */
  const getMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      const totp = data?.totp || []
      return {
        isEnrolled: totp.length > 0,
        factors: totp,
      }
    } catch (error) {
      console.error('MFA status error:', error)
      return { isEnrolled: false, factors: [] }
    }
  }

  /**
   * MFA: Enroll TOTP (returns QR code URI)
   */
  const enrollMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'GO!T Admin TOTP',
      })
      if (error) throw error
      return {
        success: true,
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      }
    } catch (error) {
      console.error('MFA enroll error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * MFA: Verify TOTP code
   */
  const verifyMFA = async (factorId, code) => {
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('MFA verify error:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * MFA: Unenroll a factor
   */
  const unenrollMFA = async (factorId) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('MFA unenroll error:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
    getMFAStatus,
    enrollMFA,
    verifyMFA,
    unenrollMFA,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
