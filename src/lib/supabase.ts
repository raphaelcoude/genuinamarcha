import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey && !url.includes('seu-projeto'))

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

export function organizationLogoUrl(path?: string | null) {
  if (!supabase || !path) return null
  return supabase.storage.from('organization-logos').getPublicUrl(path).data.publicUrl
}
