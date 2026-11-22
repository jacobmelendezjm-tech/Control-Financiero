"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/** Sin claves la app funciona igual, solo en el dispositivo. */
export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY)

let client: SupabaseClient | null = null

/** Cliente del navegador (null en el servidor o sin configurar). */
export function getSupabase() {
  if (!cloudEnabled || typeof window === "undefined") return null
  client ??= createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    // PKCE: el enlace del correo vuelve con ?code= y no pisa la navegación por #hash.
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return client
}
