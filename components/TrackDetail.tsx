'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { type Track, type Log } from '@/lib/tracks'

type Stats = {
  streak: number
  weekly: number
  monthly: number
  total: number
}

const THEMES: Record<string, { card: string; bar: string; icon: string }> = {
  violet:  { card: '#ede9fe', bar: '#c4b5fd', icon: '#7c3aed' },
  blue:    { card: '#dbeafe', bar: '#93c5fd', icon: '#2563eb' },
  teal:    { card: '#ccfbf1', bar: '#5eead4', icon: '#0d9488' },
  rose:    { card: '#ffe4e6', bar: '#fda4af', icon: '#e11d48' },
  amber:   { card: '#fef3c7', bar: '#fcd34d', icon: '#d97706' },
  fuchsia: { card: '#fae8ff', bar: '#e879f9', icon: '#a21caf' },
}

export default function TrackDetail({ trackId }: { trackId: string }) {
  const router = useRouter()
  const [track, setTrack]   = useState<Track | null>(null)
  const [logs, setLogs]     = useState<Log[]>([])
  const [stats, setStats]   = useState<Stats>({ streak: 0, weekly: 0, monthly: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  // Log modal
  const [showModal, setShowModal] = useState(false)
  const [minutes, setMinutes]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  useEffect(() => {
    const userId = localStorage.getItem('hd_user_id')
    if (!userId) { router.replace('/'); return }
    load(userId)
  }, [trackId, router])

  async function load(userId: string) {
    const [{ data: trackData }, { data: logData }] = await Promise.all([
      supabase.from('tracks').select('*').eq('id', trackId).single(),
      supabase.from('logs').select('track_id, date, minutes').eq('track_id', trackId).eq('user_id', userId).order('date', { ascending: false }).limit(30),
    ])
    if (!trackData) { router.replace('/dashboard'); return }
    setTrack(trackData)
    const l = logData ?? []
    setLogs(l)
    setStats(calcStats(l))
    setLoading(false)
  }

  async function saveLog() {
    const mins = parseInt(minutes)
    if (!mins || mins < 1) return
    const userId = localStorage.getItem('hd_user_id')!
    setSaving(true)

    await supabase.rpc('upsert_log', {
      p_track_id: trackId,
      p_user_id:  userId,
      p_date:     today(),
      p_minutes:  mins,
    })

    // refresh logs
    const { data: logData } = await supabase
      .from('logs').select('track_id, date, minutes')
      .eq('track_id', trackId).eq('user_id', userId)
      .order('date', { ascending: false }).limit(30)

    const l = logData ?? []
    setLogs(l)
    setStats(calcStats(l))
    setShowModal(false)
    setMinutes('')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading || !track) return <LoadingScreen />

  const theme = THEMES[track.theme] ?? THEMES.violet
  const recentLogs = logs.slice(0, 7)
  const maxMins = Math.max(...recentLogs.map(l => l.minutes), 1)

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#faf7f5', padding: '28px 20px 48px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <button onClick={() => router.push('/dashboard')} style={backBtn}>‹</button>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#4a4358', margin: 0 }}>{track.name}</h2>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <StatBox label="Streak" value={`🔥 ${stats.streak}`} unit="days" color="#c17a50" />
          <StatBox label="This Week" value={stats.weekly} unit="minutes" color="#7c5cbf" />
          <StatBox label="This Month" value={stats.monthly} unit="minutes" color="#7c5cbf" />
          <StatBox label="All Time" value={stats.total.toLocaleString()} unit="minutes" color="#2a9d7a" />
        </div>

        {/* Log button */}
        <button
          onClick={() => { setShowModal(true); setSaved(false) }}
          style={{
            width: '100%', padding: '13px 20px', borderRadius: 14, border: 'none',
            background: saved ? '#5eead4' : '#b8a9c9',
            color: saved ? '#134e4a' : '#fff',
            fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(184,169,201,0.35)', marginBottom: 24,
            transition: 'background 0.3s',
          }}
        >
          {saved ? '✓ Logged!' : '+ Log Today\'s Minutes'}
        </button>

        {/* Recent sessions */}
        <p style={sectionLabel}>Recent Sessions</p>
        {recentLogs.length === 0 ? (
          <p style={{ color: '#8e8498', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            No sessions yet — log your first one!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentLogs.map(log => (
              <div key={log.date} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #f0ebe6' }}>
                <div style={{ fontSize: 12, color: '#8e8498', width: 52, flexShrink: 0 }}>{formatDate(log.date)}</div>
                <div style={{ flex: 1, height: 5, background: '#f0ebe6', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${(log.minutes / maxMins) * 100}%`, height: '100%', background: theme.bar, borderRadius: 99, transition: 'width 0.4s' }} />
                </div>
                <div style={{ fontSize: 12, color: '#5c4f6e', fontWeight: 500, width: 48, textAlign: 'right', flexShrink: 0 }}>{log.minutes} min</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Modal */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(74,67,88,0.25)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}
        >
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 20px 36px', width: '100%', maxWidth: 480, borderTop: '1px solid #ebe5df', boxShadow: '0 -8px 32px rgba(74,67,88,0.1)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#4a4358', marginBottom: 16 }}>
              Log minutes for {track.name}
            </h3>
            <input
              autoFocus
              type="number"
              value={minutes}
              onChange={e => setMinutes(e.target.value)}
              placeholder="0"
              min={1}
              max={480}
              style={{ width: '100%', padding: '14px', borderRadius: 14, background: '#faf7f5', border: '1.5px solid #ebe5df', color: '#4a4358', fontSize: 32, fontWeight: 700, fontFamily: 'inherit', outline: 'none', textAlign: 'center', marginBottom: 16, boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#c9b8d9'}
              onBlur={e => e.target.style.borderColor = '#ebe5df'}
              onKeyDown={e => e.key === 'Enter' && saveLog()}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={ghostBtn}>Cancel</button>
              <button
                onClick={saveLog}
                disabled={saving || !minutes || parseInt(minutes) < 1}
                style={{ flex: 1, padding: '13px 20px', borderRadius: 14, background: '#b8a9c9', color: '#fff', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !minutes ? 0.5 : 1 }}
              >
                {saving ? 'Saving…' : 'Save ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function StatBox({ label, value, unit, color }: { label: string; value: string | number; unit: string; color: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ebe5df', borderRadius: 14, padding: 14, boxShadow: '0 1px 4px rgba(74,67,88,0.05)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#8e8498', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#8e8498', marginTop: 2 }}>{unit}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#faf7f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #e8e0f0', borderTopColor: '#b8a9c9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )
}

// ── helpers ──────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const t = new Date()
  if (dateStr === today()) return 'Today'
  if (dateStr === yesterdayStr()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function yesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function calcStats(logs: Log[]): Stats {
  const t = new Date()
  const weekStart = new Date(t)
  weekStart.setDate(t.getDate() - t.getDay())
  weekStart.setHours(0,0,0,0)
  const monthStart = new Date(t.getFullYear(), t.getMonth(), 1)

  const logged = new Set(logs.map(l => l.date))
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    if (logged.has(d.toISOString().split('T')[0])) streak++
    else break
  }

  return {
    streak,
    weekly:  logs.filter(l => new Date(l.date+'T00:00:00') >= weekStart).reduce((s, l) => s + l.minutes, 0),
    monthly: logs.filter(l => new Date(l.date+'T00:00:00') >= monthStart).reduce((s, l) => s + l.minutes, 0),
    total:   logs.reduce((s, l) => s + l.minutes, 0),
  }
}

// Shared styles
const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#8e8498',
  textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 10px',
}
const backBtn: React.CSSProperties = {
  background: '#fff', border: '1px solid #ebe5df', color: '#8e8498',
  width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
  fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}
const ghostBtn: React.CSSProperties = {
  flex: 1, padding: '13px 20px', borderRadius: 14,
  background: 'transparent', border: '1px solid #ebe5df',
  color: '#8e8498', fontWeight: 600, fontSize: 14,
  cursor: 'pointer', fontFamily: 'inherit',
}
