import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

/*
 * La llama pg_cron (Supabase) cada 10 minutos con «Authorization: Bearer <secreto>».
 * Pide a la base de datos los recordatorios que tocan (la función comprueba el
 * secreto y devuelve también las claves VAPID), los envía con Web Push y da de baja
 * las suscripciones que ya no existen. No necesita variables de entorno en Vercel.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vocggmajzqagykrojwkx.supabase.co"
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_NknYWeNaJdmHWBTxzwJs3A_pO1D3CQQ"

interface DueItem {
  endpoint: string
  p256dh: string
  auth: string
  title: string
  body: string
  url: string
  tag: string
}
interface Due {
  vapid_public: string | null
  vapid_private: string | null
  subject: string
  items: DueItem[]
}

export const maxDuration = 60

/** Solo se envía a servicios de notificaciones reales (igual que comprueba la base de datos). */
const PUSH_HOST = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com)\//
const safeUrl = (u: string) => (/^\/(?![/\\])/.test(u || "") ? u : "/")

export async function POST(request: Request) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
  if (!secret) return Response.json({ error: "No autorizado" }, { status: 401 })

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await sb.rpc("orbe_push_due", { p_secret: secret })
  if (error) return Response.json({ error: "No autorizado" }, { status: 403 })

  const due = data as Due
  due.items = (due.items || []).filter((it) => PUSH_HOST.test(it.endpoint))
  if (!due.items.length) return Response.json({ sent: 0, gone: 0 })
  if (!due.vapid_public || !due.vapid_private) return Response.json({ error: "Faltan las claves VAPID" }, { status: 500 })

  webpush.setVapidDetails(due.subject, due.vapid_public, due.vapid_private)
  const results = await Promise.allSettled(
    due.items.map((it) =>
      webpush.sendNotification(
        { endpoint: it.endpoint, keys: { p256dh: it.p256dh, auth: it.auth } },
        JSON.stringify({ title: String(it.title).slice(0, 120), body: String(it.body || "").slice(0, 400), url: safeUrl(it.url), tag: it.tag }),
        { TTL: 60 * 60 * 3, urgency: "normal" }
      )
    )
  )

  // 404/410: la suscripción ya no existe (el usuario la quitó o desinstaló).
  const gone = due.items
    .filter((_, i) => {
      const r = results[i]
      return r.status === "rejected" && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0)
    })
    .map((it) => it.endpoint)
  if (gone.length) await sb.rpc("orbe_push_gone", { p_secret: secret, p_endpoints: gone })

  const sent = results.filter((r) => r.status === "fulfilled").length
  return Response.json({ sent, failed: results.length - sent - gone.length, gone: gone.length })
}
