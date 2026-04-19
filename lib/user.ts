import { supabase } from './supabase'

export async function resolveUser(name: string): Promise<string> {
  const trimmed = name.trim()

  // find existing user by name (case-insensitive)
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .ilike('name', trimmed)
    .limit(1)
    .single()

  if (existing) return existing.id

  // create new user
  const { data: created, error } = await supabase
    .from('users')
    .insert({ name: trimmed })
    .select('id')
    .single()

  if (error || !created) throw new Error('Could not create user')
  return created.id
}
