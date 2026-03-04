'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GatePage() {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || loading) return
    setLoading(true)
    setError(false)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: value }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(true)
      setShake(true)
      setValue('')
      setLoading(false)
      setTimeout(() => setShake(false), 500)
      inputRef.current?.focus()
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; color: #f0ece4; font-family: 'DM Sans', sans-serif; font-weight: 300; min-height: 100vh; -webkit-font-smoothing: antialiased; }
        .gate { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
        .gate-left { display: flex; flex-direction: column; justify-content: space-between; padding: 3rem; border-right: 1px solid #1e1e1e; position: relative; overflow: hidden; }
        .gate-left::before { content: ''; position: absolute; top: -20%; left: -20%; width: 60%; height: 60%; background: radial-gradient(circle, rgba(232,255,71,0.04) 0%, transparent 70%); pointer-events: none; }
        .wordmark { display: flex; flex-direction: column; line-height: 0.9; letter-spacing: 0.02em; }
        .wordmark-bay { font-family: 'Bebas Neue', sans-serif; font-size: clamp(4rem, 8vw, 7rem); color: #e8ff47; }
        .wordmark-area { font-family: 'Bebas Neue', sans-serif; font-size: clamp(4rem, 8vw, 7rem); color: #f0ece4; }
        .wordmark-shows { font-family: 'Bebas Neue', sans-serif; font-size: clamp(4rem, 8vw, 7rem); color: #333; }
        .gate-tagline { font-family: 'DM Serif Display', serif; font-style: italic; font-size: 1.1rem; color: #555; line-height: 1.5; max-width: 280px; }
        .gate-right { display: flex; flex-direction: column; justify-content: center; padding: 3rem 4rem; }
        .gate-label { font-size: 0.65rem; letter-spacing: 0.2em; color: #444; text-transform: uppercase; margin-bottom: 1.5rem; }
        .gate-form { display: flex; flex-direction: column; gap: 1rem; max-width: 320px; }
        .gate-input { width: 100%; background: transparent; border: none; border-bottom: 1px solid #2a2a2a; padding: 0.75rem 0; font-family: 'DM Serif Display', serif; font-size: 1.4rem; color: #f0ece4; outline: none; transition: border-color 0.2s; letter-spacing: 0.1em; }
        .gate-input::placeholder { color: #2a2a2a; font-style: italic; }
        .gate-input:focus { border-bottom-color: #e8ff47; }
        .gate-input.error { border-bottom-color: #ff4d4d; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        .shake { animation: shake 0.4s ease; }
        .gate-error { font-size: 0.72rem; color: #ff4d4d; letter-spacing: 0.08em; text-transform: uppercase; height: 1rem; }
        .gate-submit { margin-top: 0.5rem; background: none; border: 1px solid #2a2a2a; color: #666; font-family: 'DM Sans', sans-serif; font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; padding: 0.75rem 1.5rem; cursor: pointer; transition: all 0.2s; align-self: flex-start; }
        .gate-submit:hover:not(:disabled) { border-color: #e8ff47; color: #e8ff47; }
        .gate-submit:disabled { opacity: 0.4; cursor: default; }
        .gate-lines { position: absolute; bottom: 3rem; right: 3rem; display: flex; flex-direction: column; gap: 6px; opacity: 0.15; }
        .gate-line { height: 1px; background: #f0ece4; }
        @media (max-width: 640px) { .gate { grid-template-columns: 1fr; } .gate-left { border-right: none; border-bottom: 1px solid #1e1e1e; padding: 2rem; min-height: 40vh; } .gate-right { padding: 2rem; } }
      `}</style>
      <div className="gate">
        <div className="gate-left">
          <div className="wordmark">
            <span className="wordmark-bay">BAY</span>
            <span className="wordmark-area">AREA</span>
            <span className="wordmark-shows">SHOWS</span>
          </div>
          <p className="gate-tagline">Every show worth seeing,<br />all in one place.</p>
          <div className="gate-lines">
            {[120,80,140,60,100].map((w,i) => <div key={i} className="gate-line" style={{width: w}} />)}
          </div>
        </div>
        <div className="gate-right">
          <p className="gate-label">Private Access</p>
          <form className="gate-form" onSubmit={handleSubmit}>
            <input ref={inputRef} type="password" placeholder="password" value={value}
              onChange={e => { setValue(e.target.value); setError(false) }}
              className={`gate-input ${error ? 'error' : ''} ${shake ? 'shake' : ''}`}
              autoComplete="current-password" />
            <div className="gate-error">{error ? 'incorrect password' : ''}</div>
            <button type="submit" className="gate-submit" disabled={loading || !value.trim()}>
              {loading ? 'entering...' : 'enter →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
