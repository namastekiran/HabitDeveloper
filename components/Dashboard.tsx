'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchTracksWithStats, type TrackWithStats } from '@/lib/tracks'
import { supabase } from '@/lib/supabase'

const THEMES: Record<string, { card: string; blob: string; icon: string; bar: string }> = {
  violet:  { card: 'linear-gradient(135deg,#f5f3ff,#faf5ff)', blob: '#ddd6fe', icon: '#ede9fe', bar: '#c4b5fd' },
  blue:    { card: 'linear-gradient(135deg,#eff6ff,#f0f9ff)', blob: '#bfdbfe', icon: '#dbeafe', bar: '#93c5fd' },
  teal:    { card: 'linear-gradient(135deg,#f0fdfa,#ecfdf5)', blob: '#99f6e4', icon: '#ccfbf1', bar: '#5eead4' },
  rose:    { card: 'linear-gradient(135deg,#fff1f2,#fdf2f8)', blob: '#fecdd3', icon: '#ffe4e6', bar: '#fda4af' },
  amber:   { card: 'linear-gradient(135deg,#fffbeb,#fefce8)', blob: '#fde68a', icon: '#fef3c7', bar: '#fcd34d' },
  fuchsia: { card: 'linear-gradient(135deg,#fdf4ff,#fdf2f8)', blob: '#f0abfc', icon: '#fae8ff', bar: '#e879f9' },
}

const THEME_EMOJIS: Record<string, string> = {
  violet: '⭐', blue: '📘', teal: '🌿', rose: '🌸', amber: '☀️', fuchsia: '🌺',
}

export default function Dashboard() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userId, setUserId]     = useState('')
  const [tracks, setTracks]     = useState<TrackWithStats[]>([])
  const [loading, setLoading]   = useState(true)

  // New track modal state
  const [showModal, setShowModal]     = useState(false)
  const [newName, setNewName]         = useState('')
  const [newTheme, setNewTheme]       = useState('violet')
  const [newIcon, setNewIcon]         = useState('⭐')
  const [creating, setCreating]       = useState(false)

  useEffect(() => {
    const id   = localStorage.getItem('hd_user_id')
    const name = localStorage.getItem('hd_user_name')
    if (!id) { router.replace('/'); return }
    setUserId(id)
    setUserName(name ?? '')
    fetchTracksWithStats(id).then(t => { setTracks(t); setLoading(false) })
  }, [router])

  async function createTrack() {
    if (!newName.trim() || !userId) return
    setCreating(true)
    const { data } = await supabase
      .from('tracks')
      .insert({ user_id: userId, name: newName.trim(), theme: newTheme, icon: newIcon })
      .select('*')
      .single()
    if (data) setTracks(prev => [...prev, { ...data, weekly_minutes: 0, streak: 0 }])
    setShowModal(false)
    setNewName('')
    setNewTheme('violet')
    setNewIcon('⭐')
    setCreating(false)
  }

  if (loading) return <LoadingScreen />

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#faf7f5', padding: '28px 20px 48px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#4a4358', margin: 0 }}>
              Hi, {userName} 👋
            </h1>
            <p style={{ fontSize: 13, color: '#8e8498', margin: '4px 0 0' }}>
              Keep the streak alive today
            </p>
          </div>
          <button onClick={() => setShowModal(true)} style={outlineBtn}>
            + Track
          </button>
        </div>

        {/* Section label */}
        <p style={sectionLabel}>Your Tracks</p>

        {/* Track cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {tracks.length === 0 && (
            <p style={{ color: '#8e8498', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              No tracks yet — add one above!
            </p>
          )}
          {tracks.map(track => (
            <TrackCard
              key={track.id}
              track={track}
              onClick={() => router.push(`/track/${track.id}`)}
            />
          ))}
        </div>

        {/* Friends row */}
        <div
          onClick={() => router.push('/friends')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#fff', border: '1px solid #ebe5df', borderRadius: 20,
            padding: '16px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(74,67,88,0.06)',
            transition: 'box-shadow 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(74,67,88,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(74,67,88,0.06)')}
        >
          <div style={{ width: 44, height: 44, borderRadius: 14, background: '#f3eff6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            👥
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#4a4358' }}>Friends</div>
            <div style={{ fontSize: 12, color: '#8e8498' }}>See how your friends are doing</div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#c9b8d9', fontSize: 20 }}>›</div>
        </div>
      </div>

      {/* New Track Modal */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(74,67,88,0.25)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}
        >
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 20px 36px', width: '100%', maxWidth: 480, borderTop: '1px solid #ebe5df', boxShadow: '0 -8px 32px rgba(74,67,88,0.1)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#4a4358', marginBottom: 16 }}>New Track</h3>

            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Guitar, Math, Drawing…"
              style={{ ...inputStyle, marginBottom: 16 }}
              onFocus={e => e.target.style.borderColor = '#c9b8d9'}
              onBlur={e => e.target.style.borderColor = '#ebe5df'}
            />

            <p style={sectionLabel}>Pick a theme</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {Object.entries(THEMES).map(([key, t]) => (
                <div
                  key={key}
                  onClick={() => { setNewTheme(key); setNewIcon(THEME_EMOJIS[key]) }}
                  style={{
                    width: 30, height: 30, borderRadius: '50%', background: t.blob, cursor: 'pointer',
                    border: newTheme === key ? '2.5px solid #4a4358' : '2px solid transparent',
                    transform: newTheme === key ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.15s',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={ghostBtn}>Cancel</button>
              <button
                onClick={createTrack}
                disabled={creating || !newName.trim()}
                style={{ ...primaryBtn, opacity: creating || !newName.trim() ? 0.5 : 1 }}
              >
                {creating ? 'Creating…' : 'Create Track'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function TrackCard({ track, onClick }: { track: TrackWithStats; onClick: () => void }) {
  const t = THEMES[track.theme] ?? THEMES.violet
  const maxBar = 120
  const barWidth = Math.min((track.weekly_minutes / maxBar) * 100, 100)

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 20,
        padding: 18, cursor: 'pointer', background: t.card,
        boxShadow: '0 2px 8px rgba(74,67,88,0.07)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.015)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(74,67,88,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';     e.currentTarget.style.boxShadow = '0 2px 8px rgba(74,67,88,0.07)' }}
    >
      {/* Decorative blobs */}
      <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: t.blob, opacity: 0.35 }} />
      <div style={{ position: 'absolute', bottom: -16, right: -8, width: 52, height: 52, borderRadius: '50%', background: t.blob, opacity: 0.2 }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon */}
        <div style={{ width: 44, height: 44, borderRadius: 14, background: t.icon, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {track.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#4a4358' }}>{track.name}</div>
          <div style={{ fontSize: 12, color: '#8e8498', marginTop: 2 }}>
            {track.streak > 0 ? `Streak — steady effort, day after day` : 'No sessions yet — start today'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.65)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${barWidth}%`, height: '100%', background: t.bar, borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#c17a50', whiteSpace: 'nowrap' }}>
              {track.streak > 0 ? `🔥 ${track.streak} days` : '—'}
            </span>
            <span style={{ fontSize: 11, color: '#8e8498', whiteSpace: 'nowrap' }}>
              {track.weekly_minutes} min/wk
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#faf7f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, border: '2px solid #e8e0f0', borderTopColor: '#b8a9c9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 13, color: '#8e8498' }}>Loading…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )
}

// Shared styles
const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#8e8498',
  textTransform: 'uppercase', letterSpacing: '1.2px',
  margin: '20px 0 10px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '13px 16px', borderRadius: 14,
  background: '#faf7f5', border: '1.5px solid #ebe5df',
  color: '#4a4358', fontSize: 15, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
}

const primaryBtn: React.CSSProperties = {
  flex: 1, padding: '13px 20px', borderRadius: 14,
  background: '#b8a9c9', color: '#fff', fontWeight: 600,
  fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 4px 14px rgba(184,169,201,0.35)',
}

const outlineBtn: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 10,
  background: '#fff', border: '1px solid #ebe5df',
  color: '#5c4f6e', fontWeight: 600, fontSize: 12,
  cursor: 'pointer', fontFamily: 'inherit',
}

const ghostBtn: React.CSSProperties = {
  flex: 1, padding: '13px 20px', borderRadius: 14,
  background: 'transparent', border: '1px solid #ebe5df',
  color: '#8e8498', fontWeight: 600, fontSize: 14,
  cursor: 'pointer', fontFamily: 'inherit',
}
