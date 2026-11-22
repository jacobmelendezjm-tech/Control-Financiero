"use client"

import * as React from "react"
import type { User } from "@supabase/supabase-js"

import { hasRealData, type FinanceStore } from "@/hooks/use-finance"
import { loadAll, type FinanceData } from "@/lib/finance"
import { cloudEnabled, getSupabase } from "@/lib/supabase"

/*
 * Sincronización con la nube (Supabase), con el dispositivo como fuente principal:
 *  - sin sesión, todo sigue funcionando solo en el dispositivo;
 *  - con sesión, cada cambio se sube a los pocos segundos y, al volver a la app,
 *    se traen los cambios hechos en otro dispositivo;
 *  - updated_at de la fila hace de versión: si la nube cambió y aquí también,
 *    se pregunta qué datos conservar (no se pierde nada sin avisar).
 */

const META_KEY = "orbe.cloud"
const TABLE = "finance_data"

export type CloudStatus = "off" | "syncing" | "synced" | "pending" | "offline" | "error" | "setup"

interface Meta {
  user: string
  /** updated_at de la nube la última vez que coincidió con el dispositivo ("" si aún no hay fila). */
  at: string
  /** Hay cambios en el dispositivo sin subir. */
  dirty: boolean
}

export interface CloudConflict {
  data: FinanceData
  at: string
  reason: "otra-cuenta" | "dos-dispositivos" | "primera-vez"
}

function readMeta(): Meta | null {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? (JSON.parse(raw) as Meta) : null
  } catch {
    return null
  }
}
function writeMeta(m: Meta | null) {
  try {
    if (m) localStorage.setItem(META_KEY, JSON.stringify(m))
    else localStorage.removeItem(META_KEY)
  } catch {}
}

/** Mismo formato que la copia completa de Ajustes. */
export function serialize(d: FinanceData) {
  return {
    app: "mis-finanzas",
    v: 2,
    settings: d.settings,
    goals: d.goals,
    months: d.months,
    work: d.work,
    payslips: d.payslips,
  }
}
const fromCloud = (raw: unknown) => loadAll({ ...(raw as Partial<FinanceData>), hasSettings: true })

export function useCloud(store: FinanceStore) {
  const [user, setUser] = React.useState<User | null>(null)
  const [authReady, setAuthReady] = React.useState(!cloudEnabled)
  const [status, setStatus] = React.useState<CloudStatus>("off")
  const [lastSync, setLastSync] = React.useState<string | null>(null)
  const [conflict, setConflict] = React.useState<CloudConflict | null>(null)

  const storeRef = React.useRef(store)
  React.useEffect(() => {
    storeRef.current = store
  })
  const userRef = React.useRef<User | null>(null)
  const ready = React.useRef(false) // ya se hizo la sincronización inicial de esta sesión
  const applying = React.useRef(false) // el próximo cambio local viene de la nube
  const busy = React.useRef(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ---------- sesión ---------- */
  React.useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    let alive = true
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return
      userRef.current = data.session?.user ?? null
      setUser(userRef.current)
      setAuthReady(true)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      // Fuera del callback: Supabase no admite otras llamadas dentro de él.
      setTimeout(() => {
        const u = session?.user ?? null
        if (u?.id !== userRef.current?.id) ready.current = false
        userRef.current = u
        setUser(u)
        setAuthReady(true)
      }, 0)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const apply = React.useCallback((data: FinanceData, at: string, uid: string) => {
    applying.current = true
    storeRef.current.replace(data)
    writeMeta({ user: uid, at, dirty: false })
    setLastSync(new Date().toISOString())
    setStatus("synced")
  }, [])

  const fail = React.useCallback((e: { code?: string; message?: string } | null) => {
    if (e?.code === "PGRST205" || e?.code === "42P01") return setStatus("setup")
    setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error")
  }, [])

  /** Sube los datos del dispositivo. `force` sobrescribe aunque la nube haya cambiado. */
  const push = React.useCallback(
    async (force = false) => {
      const sb = getSupabase()
      const u = userRef.current
      if (!sb || !u || !ready.current || busy.current) return
      if (!navigator.onLine) return setStatus("offline")
      busy.current = true
      setStatus("syncing")
      try {
        const meta = readMeta()
        const data = serialize(storeRef.current.real)
        let at: string | null = null
        if (meta?.user === u.id && meta.at) {
          let q = sb.from(TABLE).update({ data }).eq("user_id", u.id)
          if (!force) q = q.eq("updated_at", meta.at)
          const { data: rows, error } = await q.select("updated_at")
          if (error) return fail(error)
          if (!rows?.length) {
            // Alguien la cambió desde otro dispositivo: preguntar.
            const { data: row, error: e2 } = await sb.from(TABLE).select("data, updated_at").eq("user_id", u.id).maybeSingle()
            if (e2) return fail(e2)
            if (row) setConflict({ data: fromCloud(row.data), at: row.updated_at, reason: "dos-dispositivos" })
            setStatus("pending")
            return
          }
          at = rows[0].updated_at
        } else {
          const { data: row, error } = await sb.from(TABLE).insert({ user_id: u.id, data }).select("updated_at").single()
          if (error) {
            if (error.code === "23505") {
              const { data: cur } = await sb.from(TABLE).select("data, updated_at").eq("user_id", u.id).maybeSingle()
              if (cur) setConflict({ data: fromCloud(cur.data), at: cur.updated_at, reason: "dos-dispositivos" })
              setStatus("pending")
              return
            }
            return fail(error)
          }
          at = row.updated_at
        }
        writeMeta({ user: u.id, at: at!, dirty: false })
        setLastSync(new Date().toISOString())
        setStatus("synced")
      } finally {
        busy.current = false
      }
    },
    [fail]
  )

  /** Primera sincronización al iniciar sesión (o al abrir la app con sesión). */
  const initialSync = React.useCallback(async () => {
    const sb = getSupabase()
    const u = userRef.current
    if (!sb || !u) return
    setStatus("syncing")
    const { data: row, error } = await sb.from(TABLE).select("data, updated_at").eq("user_id", u.id).maybeSingle()
    if (error) return fail(error)
    const meta = readMeta()
    const local = storeRef.current.real
    const localHas = hasRealData(local)
    ready.current = true
    if (!row) {
      writeMeta({ user: u.id, at: "", dirty: localHas })
      if (localHas) await push()
      else setStatus("synced")
      return
    }
    if (!localHas) return apply(fromCloud(row.data), row.updated_at, u.id)
    if (meta?.user === u.id) {
      if (!meta.dirty) return row.updated_at === meta.at ? setStatus("synced") : apply(fromCloud(row.data), row.updated_at, u.id)
      if (row.updated_at === meta.at) return push()
      setConflict({ data: fromCloud(row.data), at: row.updated_at, reason: "dos-dispositivos" })
      return setStatus("pending")
    }
    setConflict({ data: fromCloud(row.data), at: row.updated_at, reason: meta?.user ? "otra-cuenta" : "primera-vez" })
    setStatus("pending")
  }, [apply, fail, push])

  React.useEffect(() => {
    if (!user || !store.loaded || ready.current) return
    void initialSync()
  }, [user, store.loaded, initialSync])

  /* ---------- cambios locales → nube ---------- */
  React.useEffect(() => {
    if (!user || !ready.current) return
    if (applying.current) {
      applying.current = false
      return
    }
    const meta = readMeta()
    writeMeta({ user: user.id, at: meta?.user === user.id ? meta.at : "", dirty: true })
    setStatus((s) => (s === "setup" ? s : "pending"))
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void push(), 1500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // Solo cuando cambian los datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.real])

  /* ---------- al volver a la app o recuperar conexión ---------- */
  React.useEffect(() => {
    if (!user) return
    const pull = async () => {
      const sb = getSupabase()
      const u = userRef.current
      if (!sb || !u || !ready.current || busy.current) return
      const meta = readMeta()
      if (meta?.dirty) return void push()
      const { data: row, error } = await sb.from(TABLE).select("data, updated_at").eq("user_id", u.id).maybeSingle()
      if (error) return fail(error)
      if (row && row.updated_at !== meta?.at) apply(fromCloud(row.data), row.updated_at, u.id)
      else setStatus("synced")
    }
    const onVis = () => document.visibilityState === "visible" && void pull()
    const onOnline = () => void pull()
    const onOffline = () => setStatus("offline")
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [user, apply, fail, push])

  /* ---------- acciones ---------- */
  const sendCode = async (email: string) => {
    const sb = getSupabase()
    if (!sb) return "La nube no está configurada."
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    })
    if (!error) return null
    if (error.status === 429) return "Has pedido demasiados códigos. Espera unos minutos y vuelve a intentarlo."
    return "No se ha podido enviar el correo. Revisa la dirección e inténtalo de nuevo."
  }
  const verifyCode = async (email: string, code: string) => {
    const sb = getSupabase()
    if (!sb) return "La nube no está configurada."
    const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: "email" })
    return error ? "El código no es válido o ha caducado. Pide uno nuevo." : null
  }
  const resolve = async (keep: "nube" | "dispositivo") => {
    const c = conflict
    const u = userRef.current
    if (!c || !u) return
    setConflict(null)
    if (keep === "nube") return apply(c.data, c.at, u.id)
    writeMeta({ user: u.id, at: c.at, dirty: true })
    await push(true)
  }
  const signOut = async (wipeLocal: boolean) => {
    const sb = getSupabase()
    if (readMeta()?.dirty) await push()
    await sb?.auth.signOut()
    ready.current = false
    writeMeta(null)
    setConflict(null)
    setLastSync(null)
    if (wipeLocal) storeRef.current.wipe()
  }
  const deleteAccount = async () => {
    const sb = getSupabase()
    if (!sb) return "La nube no está configurada."
    const { error } = await sb.rpc("delete_my_account")
    if (error) return "No se ha podido borrar la cuenta. Inténtalo de nuevo."
    await sb.auth.signOut()
    ready.current = false
    writeMeta(null)
    setLastSync(null)
    return null
  }

  return {
    enabled: cloudEnabled,
    authReady,
    user,
    // Sin sesión, el estado es siempre «solo en el dispositivo».
    status: user ? status : ("off" as CloudStatus),
    lastSync,
    conflict,
    sendCode,
    verifyCode,
    resolve,
    syncNow: () => (ready.current ? push() : initialSync()),
    signOut,
    deleteAccount,
  }
}

export type Cloud = ReturnType<typeof useCloud>
