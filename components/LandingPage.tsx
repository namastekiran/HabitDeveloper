'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resolveUser } from '@/lib/user'

export default function LandingPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const userId = await resolveUser(name)
      localStorage.setItem('hd_user_id', userId)
      localStorage.setItem('hd_user_name', name.trim())
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: '#faf7f5' }}>
      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center' }}>

        {/* Logo */}
        <div style={{
          width: 72, height: 72, borderRadius: 24,
          background: 'linear-gradient(135deg, #e8e0f0, #f3e8f0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, boxShadow: '0 4px 16px rgba(184,169,201,0.3)'
        }}>
          🧠
        </div>

        {/* Heading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#4a4358', letterSpacing: '-0.5px', margin: 0 }}>
            HabitDeveloper
          </h1>
          <p style={{ fontSize: 13, color: '#8e8498', lineHeight: 1.6, maxWidth: 240, margin: '0 auto' }}>
            Track your learning streaks and grow a little every day.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="What's your name?"
            autoFocus
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 16,
              background: '#ffffff', border: '1.5px solid #ebe5df',
              color: '#4a4358', fontSize: 15, outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#c9b8d9'}
            onBlur={e => e.target.style.borderColor = '#ebe5df'}
          />

          {error && (
            <p style={{ fontSize: 13, color: '#e57373', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{
              width: '100%', padding: '13px 20px', borderRadius: 16,
              background: '#b8a9c9', color: '#fff', fontWeight: 600,
              fontSize: 14, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s',
              boxShadow: '0 4px 14px rgba(184,169,201,0.4)',
              opacity: loading || !name.trim() ? 0.5 : 1,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#a898bc')}
            onMouseLeave={e => (e.currentTarget.style.background = '#b8a9c9')}
          >
            {loading ? 'Finding your account…' : "Let's Go →"}
          </button>
        </form>

        <p style={{ fontSize: 12, color: '#c9b8d9', margin: 0 }}>
          No password needed — just your name.
        </p>
      </div>
    </main>
  )
}
