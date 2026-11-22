"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// La clave «publishable» es pública por diseño (la seguridad la ponen las políticas
// de la base de datos), así que puede ir en el código como valor por defecto.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vocggmajzqagykrojwkx.supabase.co"
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_NknYWeNaJdmHWBTxzwJs3A_pO1D3CQQ"

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
