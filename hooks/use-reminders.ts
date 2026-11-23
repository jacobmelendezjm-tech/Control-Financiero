"use client"

import * as React from "react"

import type { FinanceData } from "@/lib/finance"
import { DEFAULT_PREFS, VAPID_PUBLIC_KEY, buildAgenda, type ReminderPrefs } from "@/lib/reminders"
import { getSupabase } from "@/lib/supabase"

const KEY = "orbe.reminders"

interface Saved {
  on: boolean
  prefs: ReminderPrefs
}

function readSaved(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<Saved>
      return { on: !!s.on, prefs: { ...DEFAULT_PREFS, ...(s.prefs || {}) } }
    }
  } catch {}
  return { on: false, prefs: DEFAULT_PREFS }
}
function writeSaved(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}

function keyToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export type ReminderSupport = "checking" | "ok" | "no-support" | "install-ios" | "dev"

export function useReminders(data: FinanceData, demo: boolean) {
  const [support, setSupport] = React.useState<ReminderSupport>("checking")
  const [permission, setPermission] = React.useState<NotificationPermission | "default">("default")
  const [on, setOn] = React.useState(false)
  const [prefs, setPrefs] = React.useState<ReminderPrefs>(DEFAULT_PREFS)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  const dataRef = React.useRef(data)
  React.useEffect(() => {
    dataRef.current = data
  }, [data])

  React.useEffect(() => {
    const s = readSaved()
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    const can = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    // Estado del navegador, que solo se conoce aquí.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(s.on)
    setPrefs(s.prefs)
    setPermission("Notification" in window ? Notification.permission : "default")
    setSupport(
      process.env.NODE_ENV !== "production" ? "dev" : ios && !standalone ? "install-ios" : can ? "ok" : "no-support"
    )
  }, [])

  /** Guarda la suscripción y la agenda en Supabase. */
  const sync = React.useCallback(async (p: ReminderPrefs) => {
    const sb = getSupabase()
    if (!sb || !("serviceWorker" in navigator)) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    const j = sub.toJSON()
    const agenda = demo ? [] : buildAgenda(dataRef.current, p)
    const hora = Number(p.horaDiario.slice(0, 2)) || 20
    const { error: e } = await sb.rpc("orbe_push_sync", {
      p_endpoint: j.endpoint,
      p_p256dh: j.keys?.p256dh,
      p_auth: j.keys?.auth,
      p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      p_agenda: agenda,
      p_nudge: p.nudge,
      p_hora: hora,
    })
    if (e) setError("No se han podido guardar los recordatorios. Se reintentará al volver a abrir la app.")
    else setError("")
  }, [demo])

  // Mantener la agenda al día: al abrir, al volver a la app y cuando cambian los datos.
  React.useEffect(() => {
    if (!on || support !== "ok") return
    const t = setTimeout(() => void sync(prefs), 2500)
    return () => clearTimeout(t)
  }, [on, support, prefs, data, sync])
  React.useEffect(() => {
    if (!on || support !== "ok") return
    const onVis = () => document.visibilityState === "visible" && void sync(prefs)
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [on, support, prefs, sync])

  const enable = async () => {
    setError("")
    if (support !== "ok") return false
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== "granted") {
        setError("Has bloqueado las notificaciones. Actívalas en los ajustes del navegador para este sitio.")
        return false
      }
      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) }))
      if (!sub) throw new Error("sin suscripción")
      setOn(true)
      writeSaved({ on: true, prefs })
      await sync(prefs)
      return true
    } catch {
      setError("No se han podido activar las notificaciones en este navegador.")
      return false
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await getSupabase()?.rpc("orbe_push_unsubscribe", { p_endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
    } catch {}
    setOn(false)
    writeSaved({ on: false, prefs })
    setBusy(false)
  }

  const update = (patch: Partial<ReminderPrefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    writeSaved({ on, prefs: next })
  }

  /** Notificación de prueba, al momento (sin pasar por el servidor). */
  const test = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification("Orbe", {
        body: "¡Así te avisaré! Tus recordatorios están activados 🛰️",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        tag: "orbe-prueba",
        data: { url: "/" },
      })
    } catch {
      setError("No se ha podido mostrar la notificación de prueba.")
    }
  }

  const upcoming = on && !demo ? buildAgenda(data, prefs).slice(0, 3) : []
  return { support, permission, on, prefs, busy, error, enable, disable, update, test, upcoming }
}

export type Reminders = ReturnType<typeof useReminders>
