"use client"

import * as React from "react"
import type { RealtimeChannel, SupabaseClient, User } from "@supabase/supabase-js"

import { hasRealData, type FinanceStore } from "@/hooks/use-finance"
import {
  SINGLE,
  SOFT,
  TABLES,
  canonical,
  cloneRows,
  fromRows,
  hasCloudData,
  keyOf,
  sameRow,
  toRows,
  type Row,
  type RowSet,
  type Table,
} from "@/lib/cloud-rows"
import { loadAll, type FinanceData } from "@/lib/finance"
import { cloudEnabled, getSupabase } from "@/lib/supabase"

/*
 * Sincronización por filas con Supabase, con el dispositivo como fuente principal:
 *  - sin sesión, todo funciona solo en el dispositivo;
 *  - «base» = última versión de cada fila que coincidía con la nube;
 *  - subir: lo que difiere de la base (altas, cambios y borrados lógicos);
 *  - bajar: filas con updated_at posterior al cursor; si esa fila no se tocó aquí,
 *    se aplica (si se tocó aquí, gana la de aquí y se sube después);
 *  - tiempo real: otro dispositivo cambia algo → se baja al momento.
 */

const SYNC_KEY = "orbe.sync.v2"
const LEGACY_META = "orbe.cloud"

export type CloudStatus = "off" | "syncing" | "synced" | "pending" | "offline" | "error" | "setup"

interface SyncState {
  user: string
  cursor: string // mayor updated_at visto en la nube
  base: RowSet
}

export interface CloudConflict {
  data: FinanceData
  at: string
  reason: "otra-cuenta" | "dos-dispositivos" | "primera-vez"
}

function readSync(): SyncState | null {
  try {
    const raw = localStorage.getItem(SYNC_KEY)
    return raw ? (JSON.parse(raw) as SyncState) : null
  } catch {
    return null
  }
}
function writeSync(s: SyncState | null) {
  try {
    if (s) localStorage.setItem(SYNC_KEY, JSON.stringify(s))
    else localStorage.removeItem(SYNC_KEY)
    localStorage.removeItem(LEGACY_META)
  } catch {}
}

/** Mismo formato que la copia completa de Ajustes. */
export function serialize(d: FinanceData) {
  return { app: "mis-finanzas", v: 3, settings: d.settings, goals: d.goals, months: d.months, work: d.work, payslips: d.payslips, aportes: d.aportes }
}

const maxIso = (a: string, b: string) => (a > b ? a : b)

type Err = { code?: string; message?: string } | null

/** Descarga filas (todas o desde el cursor), incluidos los borrados lógicos. */
async function fetchRows(sb: SupabaseClient, uid: string, since: string | null) {
  const rows = TABLES.reduce((acc, t) => ({ ...acc, [t]: [] }), {} as Record<Table, Record<string, unknown>[]>)
  let cursor = since || ""
  for (const t of TABLES) {
    let q = sb.from(t).select("*").eq("user_id", uid)
    if (since) q = q.gt("updated_at", since)
    const { data, error } = await q
    if (error) return { error: error as Err, rows, cursor }
    rows[t] = data || []
    for (const r of rows[t]) cursor = maxIso(cursor, String(r.updated_at))
  }
  return { error: null as Err, rows, cursor }
}

/** Filas descargadas → RowSet de las vigentes (sin borradas). */
function liveSet(rows: Record<Table, Record<string, unknown>[]>): RowSet {
  const rs = Object.fromEntries(TABLES.map((t) => [t, {}])) as unknown as RowSet
  for (const t of TABLES)
    for (const raw of rows[t]) {
      if (raw.deleted_at) continue
      if (t === "work_schedules" && raw.activo === false) continue
      const r = canonical(t, raw)
      rs[t][keyOf(t, r)] = r
    }
  // Días de horario huérfanos (sin horario activo) no cuentan.
  if (!rs.work_schedules.me) rs.work_schedule_days = {}
  return rs
}

export function useCloud(store: FinanceStore) {
  const [user, setUser] = React.useState<User | null>(null)
  const [authReady, setAuthReady] = React.useState(!cloudEnabled)
  const [status, setStatus] = React.useState<CloudStatus>("off")
  const [lastSync, setLastSync] = React.useState<string | null>(null)
  const [conflict, setConflict] = React.useState<(CloudConflict & { server: RowSet; cursor: string }) | null>(null)
  /** Motivo del último fallo, para mostrarlo en la cuenta. */
  const [lastError, setLastError] = React.useState<string | null>(null)
  const initRunning = React.useRef(false)
  const initialRef = React.useRef<() => Promise<void>>(async () => {})

  const storeRef = React.useRef(store)
  React.useEffect(() => {
    storeRef.current = store
  })
  const userRef = React.useRef<User | null>(null)
  const ready = React.useRef(false)
  const applying = React.useRef(false)
  const busy = React.useRef(false)
  const again = React.useRef(false)
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

  const fail = React.useCallback((e: Err) => {
    const msg = [e?.code, e?.message].filter(Boolean).join(" · ") || "error desconocido"
    setLastError(msg)
    if (typeof console !== "undefined") console.warn("[Orbe nube]", msg)
    if (e?.code === "PGRST205" || e?.code === "42P01") return setStatus("setup")
    setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error")
  }, [])
  const crash = (e: unknown): Err => ({ message: e instanceof Error ? e.message : String(e) })

  const applyLocal = React.useCallback((rs: RowSet) => {
    applying.current = true
    storeRef.current.replace(fromRows(rs))
  }, [])

  /** Sube la diferencia entre `target` y `base`. Devuelve false si algo falló. */
  const upload = React.useCallback(
    async (sb: SupabaseClient, uid: string, target: RowSet, base: RowSet) => {
      const now = new Date().toISOString()
      for (const t of TABLES) {
        const changed: Row[] = []
        const removed: Row[] = []
        for (const [k, r] of Object.entries(target[t])) if (!sameRow(r, base[t][k])) changed.push(r)
        for (const [k, r] of Object.entries(base[t])) if (!(k in target[t])) removed.push(r)
        if (t === "work_schedule_days" || t === "work_week_plans" || t === "work_day_notes") {
          // Horarios y notas se borran de verdad: quitar lo eliminado y escribir lo nuevo.
          const keys = t === "work_schedule_days" ? ["semana", "dia"] : t === "work_week_plans" ? ["lunes", "dia"] : ["fecha"]
          for (const r of removed) {
            let q = sb.from(t).delete().eq("user_id", uid)
            for (const k of keys) q = q.eq(k, r[k] as string)
            const { error } = await q
            if (error) return error as Err
          }
          if (changed.length) {
            const { error } = await sb.from(t).upsert(changed.map((r) => ({ ...r, user_id: uid })), { onConflict: ["user_id", ...keys].join(",") })
            if (error) return error as Err
          }
          continue
        }
        const rows: Record<string, unknown>[] = changed.map((r) => ({ ...r, user_id: uid, ...(SOFT.includes(t) ? { deleted_at: null } : {}) }))
        if (SOFT.includes(t)) for (const r of removed) rows.push({ ...r, user_id: uid, deleted_at: now })
        if (t === "work_schedules" && removed.length) rows.push({ ...removed[0], user_id: uid, activo: false })
        if (!rows.length) continue
        const onConflict = SINGLE.includes(t) ? "user_id" : "user_id,id"
        // Por tandas para no enviar peticiones enormes.
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await sb.from(t).upsert(rows.slice(i, i + 500), { onConflict })
          if (error) return error as Err
        }
      }
      return null
    },
    []
  )

  /** Bajar cambios y subir los locales (sincronización incremental). */
  const sync = React.useCallback(async () => {
    const sb = getSupabase()
    const u = userRef.current
    if (!sb || !u || !ready.current) return
    if (busy.current) {
      again.current = true
      return
    }
    if (!navigator.onLine) return setStatus("offline")
    busy.current = true
    setStatus("syncing")
    try {
      const st = readSync()
      if (!st || st.user !== u.id) {
        // Sin punto de partida (p. ej. falló la primera subida): empezar de nuevo.
        ready.current = false
        setTimeout(() => void initialRef.current(), 0)
        return
      }
      // 1) Bajar lo cambiado desde el cursor.
      const { error, rows, cursor } = await fetchRows(sb, u.id, st.cursor || null)
      if (error) return fail(error)
      const local = toRows(storeRef.current.real)
      const base = st.base
      let touched = false
      for (const t of TABLES)
        for (const raw of rows[t]) {
          const r = canonical(t, raw)
          const k = keyOf(t, r)
          const gone = !!raw.deleted_at || (t === "work_schedules" && raw.activo === false)
          const server = gone ? undefined : r
          const localChanged = !sameRow(local[t][k], base[t][k])
          if (!localChanged && !sameRow(local[t][k], server)) {
            if (server) local[t][k] = server
            else delete local[t][k]
            touched = true
          }
          if (server) base[t][k] = server
          else delete base[t][k]
        }
      // Horarios: se borran filas de verdad, así que se comparan completos para ver los borrados.
      for (const t of ["work_schedule_days", "work_week_plans", "work_day_notes"] as const) {
        const { data: all, error: e2 } = await sb.from(t).select("*").eq("user_id", u.id)
        if (e2) return fail(e2 as Err)
        const live = new Set((all || []).map((raw) => keyOf(t, canonical(t, raw))))
        for (const k of Object.keys(base[t]))
          if (!live.has(k)) {
            if (sameRow(local[t][k], base[t][k])) {
              delete local[t][k]
              touched = true
            }
            delete base[t][k]
          }
      }
      if (touched) {
        if (!local.work_schedules.me) local.work_schedule_days = {}
        applyLocal(local)
      }
      // 2) Subir lo que difiere de la base.
      const upErr = await upload(sb, u.id, local, base)
      if (upErr) return fail(upErr)
      writeSync({ user: u.id, cursor, base: cloneRows(local) })
      setLastSync(new Date().toISOString())
      setLastError(null)
      setStatus("synced")
    } catch (e) {
      fail(crash(e))
    } finally {
      busy.current = false
      if (again.current) {
        again.current = false
        setTimeout(() => void sync(), 300)
      }
    }
  }, [applyLocal, fail, upload])

  /** Primera sincronización de la sesión. */
  async function initialSyncInner() {
    const sb = getSupabase()
    const u = userRef.current
    if (!sb || !u) return
    setStatus("syncing")
    const { error, rows, cursor } = await fetchRows(sb, u.id, null)
    if (error) return fail(error)
    let server = liveSet(rows)
    const st = readSync()
    const localData = storeRef.current.real
    const localHas = hasRealData(localData)

    // Mismo usuario ya sincronizado en este dispositivo: mezcla por filas.
    if (st?.user === u.id) {
      ready.current = true
      writeSync({ ...st, cursor: "" })
      // Con cursor vacío, sync() trata toda la nube como «cambiada» y mezcla fila a fila.
      return void sync()
    }

    // Formato antiguo (un único documento): se migra si las tablas están vacías.
    let serverHas = hasCloudData(server)
    if (!serverHas) {
      const { data: legacy } = await sb.from("finance_data").select("data, updated_at").eq("user_id", u.id).maybeSingle()
      if (legacy?.data) {
        server = toRows(loadAll({ ...(legacy.data as Partial<FinanceData>), hasSettings: true }))
        serverHas = hasCloudData(server)
        // La base es lo que hay de verdad en las tablas (vacío): así se sube todo.
        if (!localHas) {
          ready.current = true
          applyLocal(server)
          const upErr = await upload(sb, u.id, server, liveSet(rows))
          if (upErr) {
            ready.current = false
            return fail(upErr)
          }
          writeSync({ user: u.id, cursor, base: cloneRows(server) })
          setLastSync(new Date().toISOString())
          setLastError(null)
          return setStatus("synced")
        }
        setConflict({ data: fromRows(server), at: legacy.updated_at, reason: "primera-vez", server: liveSet(rows), cursor })
        return setStatus("pending")
      }
    }

    if (!serverHas) {
      // Nube vacía: se sube lo del dispositivo.
      ready.current = true
      const target = toRows(localData)
      const upErr = await upload(sb, u.id, target, liveSet(rows))
      if (upErr) {
        ready.current = false
        return fail(upErr)
      }
      writeSync({ user: u.id, cursor, base: cloneRows(target) })
      setLastSync(new Date().toISOString())
      setLastError(null)
      return setStatus("synced")
    }
    if (!localHas) {
      ready.current = true
      applyLocal(server)
      writeSync({ user: u.id, cursor, base: cloneRows(server) })
      setLastSync(new Date().toISOString())
      setLastError(null)
      return setStatus("synced")
    }
    // Datos en los dos sitios y nunca sincronizados juntos: preguntar.
    setConflict({ data: fromRows(server), at: cursor, reason: st?.user ? "otra-cuenta" : "primera-vez", server, cursor })
    setStatus("pending")
  }
  const initialSync = React.useCallback(async () => {
    if (initRunning.current) return
    initRunning.current = true
    try {
      await initialSyncInner()
    } catch (e) {
      ready.current = false
      fail(crash(e))
    } finally {
      initRunning.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fail])

  React.useEffect(() => {
    initialRef.current = initialSync
  })

  /** Sincronizar ahora: la inicial si aún no se pudo, si no la incremental. */
  const kick = React.useCallback(() => (ready.current ? sync() : initialSync()), [sync, initialSync])

  // Vigilante: si algo se queda «sincronizando» más de 25 s, se marca como fallo.
  React.useEffect(() => {
    if (status !== "syncing") return
    const t = setTimeout(() => {
      busy.current = false
      initRunning.current = false
      fail({ message: "La sincronización ha tardado demasiado. Revisa tu conexión y pulsa Reintentar." })
    }, 25000)
    return () => clearTimeout(t)
  }, [status, fail])

  React.useEffect(() => {
    if (!user || !store.loaded || ready.current) return
    void initialSync()
  }, [user, store.loaded, initialSync])

  /* ---------- cambios locales → nube (con un pequeño retardo) ---------- */
  React.useEffect(() => {
    if (!user) return
    if (applying.current) {
      applying.current = false
      return
    }
    setStatus((s) => (s === "setup" ? s : "pending"))
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void kick(), 1200)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // Solo cuando cambian los datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.real])

  /* ---------- al volver a la app, recuperar conexión o cambios en tiempo real ---------- */
  React.useEffect(() => {
    if (!user) return
    const sb = getSupabase()
    const onVis = () => document.visibilityState === "visible" && void kick()
    const onOnline = () => void kick()
    const onOffline = () => setStatus("offline")
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)

    let channel: RealtimeChannel | null = null
    let rt: ReturnType<typeof setTimeout> | null = null
    if (sb) {
      channel = sb.channel(`orbe-${user.id}`)
      for (const t of TABLES.filter((x) => x !== "work_schedule_days"))
        channel.on("postgres_changes", { event: "*", schema: "public", table: t, filter: `user_id=eq.${user.id}` }, () => {
          if (rt) clearTimeout(rt)
          rt = setTimeout(() => void kick(), 800)
        })
      channel.subscribe()
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
      if (rt) clearTimeout(rt)
      if (channel && sb) void sb.removeChannel(channel)
    }
  }, [user, kick])

  /* ---------- el nombre de la cuenta sigue al del perfil (lo usan los correos) ---------- */
  const nombre = store.real.settings.nombre
  React.useEffect(() => {
    const sb = getSupabase()
    if (!sb || !user || !nombre || user.user_metadata?.nombre === nombre) return
    const t = setTimeout(() => void sb.auth.updateUser({ data: { nombre } }), 2000)
    return () => clearTimeout(t)
  }, [user, nombre])

  /* ---------- acciones ---------- */
  const sendCode = async (email: string) => {
    const sb = getSupabase()
    if (!sb) return "La nube no está configurada."
    // El nombre viaja con el alta para que el correo de bienvenida salude por el nombre.
    const nombre = storeRef.current.real.settings.nombre || undefined
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin, ...(nombre ? { data: { nombre } } : {}) },
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
    const sb = getSupabase()
    const u = userRef.current
    if (!c || !u || !sb) return
    setConflict(null)
    ready.current = true
    setStatus("syncing")
    const target = keep === "nube" ? toRows(c.data) : toRows(storeRef.current.real)
    if (keep === "nube") applyLocal(target)
    const upErr = await upload(sb, u.id, target, c.server)
    if (upErr) return fail(upErr)
    writeSync({ user: u.id, cursor: c.cursor, base: cloneRows(target) })
    setLastSync(new Date().toISOString())
    setStatus("synced")
  }
  const signOut = async (wipeLocal: boolean) => {
    const sb = getSupabase()
    if (ready.current) await sync()
    await sb?.auth.signOut()
    ready.current = false
    writeSync(null)
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
    writeSync(null)
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
    conflict: conflict ? { data: conflict.data, at: conflict.at, reason: conflict.reason } : null,
    sendCode,
    verifyCode,
    resolve,
    syncNow: kick,
    lastError,
    signOut,
    deleteAccount,
  }
}

export type Cloud = ReturnType<typeof useCloud>
