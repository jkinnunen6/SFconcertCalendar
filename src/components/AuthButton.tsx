'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import styles from './AuthButton.module.css'

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setMenuOpen(false)
  }

  if (loading) return null

  if (!user) {
    return (
      <button className={styles.signInBtn} onClick={signIn}>
        SIGN IN
      </button>
    )
  }

  const initials = user.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email?.[0].toUpperCase() ?? '?'

  const avatar = user.user_metadata?.avatar_url

  return (
    <div className={styles.wrap} ref={menuRef}>
      <button className={styles.avatarBtn} onClick={() => setMenuOpen(o => !o)}>
        {avatar
          ? <img src={avatar} alt={initials} className={styles.avatarImg} referrerPolicy="no-referrer" />
          : <span className={styles.avatarInitials}>{initials}</span>
        }
      </button>
      {menuOpen && (
        <div className={styles.menu}>
          <div className={styles.menuEmail}>{user.user_metadata?.full_name || user.email}</div>
          <button className={styles.menuItem} onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  )
}
