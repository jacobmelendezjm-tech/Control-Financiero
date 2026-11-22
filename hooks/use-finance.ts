"use client"

import * as React from "react"
import { toast } from "sonner"

import { buildDemo, emptyData, loadAll, type FinanceData } from "@/lib/finance"

/* Misma clave que la versión HTML original: los datos ya apuntados se conservan. */
const LS_KEY = "mis-finanzas.v1"

export type StorageMode = "loading" | "local" | "memory"

function readStorage(): { data: FinanceData; mode: StorageMode } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return { data: raw ? loadAll(JSON.parse(raw)) : emptyData(), mode: "local" }
  } catch {
    return { data: emptyData(), mode: "memory" }
  }
}

export function useFinance() {
  const [data, setData] = React.useState<FinanceData>(emptyData)
  const [mode, setMode] = React.useState<StorageMode>("loading")
  const [demoOff, setDemoOff] = React.useState(false)
  const demo = React.useMemo(() => (mode === "loading" ? null : buildDemo()), [mode])
  const modeRef = React.useRef<StorageMode>("loading")

  React.useEffect(() => {
    const r = readStorage()
    modeRef.current = r.mode
    // Carga inicial desde localStorage, que solo existe en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(r.data)
    setMode(r.mode)
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) setData(readStorage().data)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const persist = React.useCallback((next: FinanceData) => {
    if (modeRef.current !== "local") return
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next))
    } catch {
      modeRef.current = "memory"
      setMode("memory")
      toast.error("No se pudo guardar en este navegador. Descarga una copia en Ajustes.")
    }
  }, [])

  /** Aplica un cambio a los datos reales y lo guarda. */
  const update = React.useCallback(
    (fn: (draft: FinanceData) => void) => {
      setDemoOff(true)
      setData((prev) => {
        const next: FinanceData = structuredClone(prev)
        fn(next)
        persist(next)
        return next
      })
    },
    [persist]
  )

  const wipe = React.useCallback(() => {
    setDemoOff(true)
    setData(emptyData())
    try {
      localStorage.removeItem(LS_KEY)
    } catch {}
  }, [])

  const hasReal = hasRealData(data)
  const showingDemo = mode !== "loading" && !demoOff && !hasReal

  /** Sustituye todos los datos (p. ej. al traerlos de la nube). */
  const replace = React.useCallback(
    (next: FinanceData) => {
      setDemoOff(true)
      setData(next)
      persist(next)
    },
    [persist]
  )

  return {
    replace,
    real: data,
    view: showingDemo && demo ? demo : data,
    showingDemo,
    loaded: mode !== "loading",
    mode,
    update,
    wipe,
    dismissDemo: () => setDemoOff(true),
  }
}

/** ¿Hay datos propios (no de ejemplo)? */
export function hasRealData(d: FinanceData) {
  return (
    d.hasSettings ||
    Object.keys(d.months).length > 0 ||
    d.goals.length > 0 ||
    d.work.shifts.length > 0 ||
    d.payslips.length > 0
  )
}

export type FinanceStore = ReturnType<typeof useFinance>
