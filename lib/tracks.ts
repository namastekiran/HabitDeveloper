import { supabase } from './supabase'

export type Track = {
  id: string
  user_id: string
  name: string
  theme: string
  icon: string
  created_at: string
}

export type Log = {
  track_id: string
  date: string
  minutes: number
}

export type TrackWithStats = Track & {
  weekly_minutes: number
  streak: number
}

export async function fetchTracksWithStats(userId: string): Promise<TrackWithStats[]> {
  const [{ data: tracks }, { data: logs }] = await Promise.all([
    supabase.from('tracks').select('*').eq('user_id', userId).order('created_at'),
    supabase
      .from('logs')
      .select('track_id, date, minutes')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo()),
  ])

  if (!tracks) return []

  return tracks.map(track => {
    const trackLogs = (logs ?? []).filter(l => l.track_id === track.id)
    return {
      ...track,
      weekly_minutes: calcWeeklyMinutes(trackLogs),
      streak: calcStreak(trackLogs),
    }
  })
}

function thirtyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

function calcWeeklyMinutes(logs: Log[]): number {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  return logs
    .filter(l => new Date(l.date) >= weekStart)
    .reduce((sum, l) => sum + l.minutes, 0)
}

function calcStreak(logs: Log[]): number {
  const logged = new Set(logs.map(l => l.date))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (logged.has(key)) streak++
    else break
  }
  return streak
}
