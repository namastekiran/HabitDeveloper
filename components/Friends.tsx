'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type FriendTrack = {
  name: string
  theme: string
  icon: string
  streak: number
  weekly_minutes: number
}

type FriendData = {
  id: string
  name: string
  tracks: FriendTrack[]
}

const THEMES: Record<string, { bar: string }> = {
  violet:  { bar: '#c4b5fd' },
  blue:    { bar: '#93c5fd' },
  teal:    { bar: '#5eead4' },
  rose:    { bar: '#fda4af' },
  amber:   { bar: '#fcd34d' },
  fuchsia: { bar: '#e879f9' },
}

export default function Friends() {
  const router = useRouter()
  const [userId, setUserId]       = useState('')
  const [friends, setFriends]     = useState<FriendData[]>([])
  const [loading, setLoading]     = useState(true)
  const [friendInput, setFriendInput] = useState('')
  const [adding, setAdding]       = useState(false)
  const [addError, setAddError]   = useState('')

  useEffect(() => {
    const id = localStorage.getItem('hd_user_id')
    if (!id) { router.replace('/'); return }
    setUserId(id)
    loadFriends(id)
  }, [router])

  async function loadFriends(uid: string) {
    setLoading(true)

    // get friend ids
    const { data: rows } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', uid)

    if (!rows || rows.length === 0) { setLoading(false); return }

    const friendIds = rows.map(r => r.friend_id)

    // get friend users
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', friendIds)

    if (!users) { setLoading(false); return }

    // get tracks + logs for all friends
    const { data: tracks } = await supabase
      .from('tracks')
      .select('id, user_id, name, theme, icon')
      .in('user_id', friendIds)

    const thirtyAgo = new Date()
    thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    const since = thirtyAgo.toISOString().split('T')[0]

    const { data: logs } = await supabase
      .from('logs')
      .select('track_id, user_id, date, minutes')
      .in('user_id', friendIds)
      .gte('date', since)

    const allTracks = tracks ?? []
    const allLogs   = logs ?? []

    const friendData: FriendData[] = users.map(user => ({
      id: user.id,
      name: user.name,
      tracks: allTracks
        .filter(t => t.user_id === user.id)
        .map(t => {
          const tLogs = allLogs.filter(l => l.track_id === t.id)
          return {
            name: t.name,
            theme: t.theme,
            icon: t.icon,
            streak: calcStreak(tLogs),
            weekly_minutes: calcWeekly(tLogs),
          }
        }),
    }))

    setFriends(friendData)
    setLoading(false)
  }

  async function addFriend() {
    const input = friendInput.trim()
    if (!input || !userId) return
    setAdding(true)
    setAddError('')

    // look up by id or name
    const isUuid = /^[0-9a-f-]{36}$/i.test(input)
    const query = isUuid
      ? supabase.from('users').select('id, name').eq('id', input).single()
      : supabase.from('users').select('id, name').ilike('name', input).single()

    const { data: found } = await query

    if (!found) {
      setAddError('User not found. Try their exact name or user ID.')
      setAdding(false)
      return
    }

    if (found.id === userId) {
      setAddError("You can't add yourself.")
      setAdding(false)
      return
    }

    const { error } = await supabase
      .from('friends')
      .insert({ user_id: userId, friend_id: found.id })

    if (error) {
      setAddError(error.code === '23505' ? 'Already your friend!' : 'Could not add friend.')
      setAdding(false)
      return
    }

    setFriendInput('')
    loadFriends(userId)
    setAdding(false)
  }

  if (loading) return <LoadingScreen />

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#faf7f5', padding: '28px 20px 48px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <button onClick={() => router.push('/dashboard')} style={backBtn}>‹</button>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#4a4358', margin: 0 }}>Friends</h2>
        </div>

        {/* Add friend */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input
            value={friendInput}
            onChange={e => { setFriendInput(e.target.value); setAddError('') }}
            placeholder="Add by name or user ID…"
            onKeyDown={e => e.key === 'Enter' && addFriend()}
            style={{ flex: 1, padding: '11px 14px', borderRadius: 12, background: '#fff', border: '1.5px solid #ebe5df', color: '#4a4358', fontSize: 14, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = '#c9b8d9'}
            onBlur={e => e.target.style.borderColor = '#ebe5df'}
          />
          <button
            onClick={addFriend}
            disabled={adding || !friendInput.trim()}
            style={{ padding: '11px 16px', borderRadius: 12, background: '#b8a9c9', color: '#fff', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: adding || !friendInput.trim() ? 0.5 : 1 }}
          >
            {adding ? '…' : 'Add'}
          </button>
        </div>

        {addError && (
          <p style={{ fontSize: 12, color: '#e57373', marginBottom: 16 }}>{addError}</p>
        )}

        {/* Your user ID hint */}
        <p style={{ fontSize: 11, color: '#c9b8d9', marginBottom: 20 }}>
          Your ID: <span style={{ fontFamily: 'monospace', userSelect: 'all' }}>{userId}</span>
        </p>

        <p style={sectionLabel}>Your Friends</p>

        {friends.length === 0 ? (
          <p style={{ color: '#8e8498', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
            No friends yet — add one above!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {friends.map(friend => (
              <FriendCard key={friend.id} friend={friend} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function FriendCard({ friend }: { friend: FriendData }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ebe5df', borderRadius: 20, padding: 16, boxShadow: '0 1px 4px rgba(74,67,88,0.05)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#4a4358', marginBottom: 10 }}>{friend.name}</div>
      {friend.tracks.length === 0 && (
        <p style={{ fontSize: 13, color: '#8e8498', margin: 0 }}>No tracks yet</p>
      )}
      {friend.tracks.map(track => (
        <div key={track.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0ebe6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>{track.icon}</span>
            <span style={{ fontSize: 13, color: '#8e8498' }}>{track.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span style={{ color: '#c17a50', fontWeight: 600 }}>
              {track.streak > 0 ? `🔥 ${track.streak} days` : '—'}
            </span>
            <span style={{ color: THEMES[track.theme]?.bar ?? '#c4b5fd', fontWeight: 500 }}>
              {track.weekly_minutes} min/wk
            </span>
          </div>
        </div>
      ))}
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

function calcStreak(logs: { date: string; minutes: number }[]): number {
  const logged = new Set(logs.map(l => l.date))
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    if (logged.has(d.toISOString().split('T')[0])) streak++
    else break
  }
  return streak
}

function calcWeekly(logs: { date: string; minutes: number }[]): number {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  return logs
    .filter(l => new Date(l.date + 'T00:00:00') >= weekStart)
    .reduce((s, l) => s + l.minutes, 0)
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#8e8498',
  textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 10px',
}
const backBtn: React.CSSProperties = {
  background: '#fff', border: '1px solid #ebe5df', color: '#8e8498',
  width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
  fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
