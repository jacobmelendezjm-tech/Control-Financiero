"use client"

import * as React from "react"
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BugIcon,
  ChartPieIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  EllipsisIcon,
  FileTextIcon,
  HouseIcon,
  ListIcon,
  PiggyBankIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AportDialog,
  CatDialog,
  ConfirmDialog,
  GoalDialog,
  RecDialog,
  TextDialog,
  TxDialog,
  type TxSaveResult,
} from "@/components/finanzas/dialogs"
import { HomeView } from "@/components/finanzas/home-view"
import { HormigaView } from "@/components/finanzas/hormiga-view"
import { OrbeWordmark } from "@/components/finanzas/logo"
import { MoreView } from "@/components/finanzas/more-view"
import { OrbiBuddy, OrbiTour } from "@/components/finanzas/orbi-guide"
import { Splash } from "@/components/finanzas/splash"
import { ThemeToggle } from "@/components/finanzas/theme-toggle"
import { PayslipDialog, ShiftDialog, WorkCfgDialog, type PayslipSaveResult } from "@/components/finanzas/work-dialogs"
import { WorkView } from "@/components/finanzas/work-view"
import {
  AjustesView,
  Banners,
  MetasView,
  MovView,
  PresView,
  ResumenView,
  type Filters,
} from "@/components/finanzas/views"
import { useFinance } from "@/hooks/use-finance"
import { orbiSay, pick } from "@/lib/orbi"
import { scrollToY, setScrollLocked } from "@/lib/scroll"
import { usePwa } from "@/hooks/use-pwa"
import {
  CUR,
  addMonths,
  byDate,
  catMap,
  daysIn,
  eur,
  hormigaStats,
  importCSVRows,
  isHormiga,
  loadAll,
  monthLabel,
  pad,
  parseCSV,
  parseMoney,
  parsePos,
  todayStr,
  toCSV,
  txKey,
  uid,
  ym,
  type Category,
  type FinanceData,
  type Goal,
  type Payslip,
  type Recurring,
  type Shift,
  type Tx,
  type TxType,
  type WorkCfg,
} from "@/lib/finance"
import { dayTotals, fmtMin, monthDays, shiftMinutes, summarize } from "@/lib/work"
import { cn } from "@/lib/utils"

const VIEWS = [
  "inicio",
  "resumen",
  "movimientos",
  "presupuesto",
  "metas",
  "hormiga",
  "trabajo",
  "nominas",
  "mas",
  "ajustes",
] as const
type View = (typeof VIEWS)[number]
const MONTH_VIEWS: View[] = ["resumen", "movimientos", "presupuesto", "hormiga", "trabajo"]
const TITLES: Record<View, string> = {
  inicio: "Inicio",
  resumen: "Análisis",
  movimientos: "Movimientos",
  presupuesto: "Presupuestos",
  metas: "Ahorro y metas",
  hormiga: "Gastos hormiga",
  trabajo: "Trabajo",
  nominas: "Trabajo",
  mas: "Más",
  ajustes: "Ajustes",
}
type Tab = "inicio" | "resumen" | "trabajo" | "mas"
const tabOf = (v: View): Tab =>
  v === "inicio" ? "inicio" : v === "resumen" ? "resumen" : v === "trabajo" || v === "nominas" ? "trabajo" : "mas"
const PARENT: Partial<Record<View, View>> = {
  movimientos: "mas",
  presupuesto: "mas",
  metas: "mas",
  hormiga: "mas",
  ajustes: "mas",
}

type Sheet =
  | { kind: "tx"; tx: Tx | null; type?: TxType }
  | { kind: "goal"; goal: Goal | null }
  | { kind: "aport"; goal: Goal; sign: 1 | -1 }
  | { kind: "rec"; rec: Recurring | null }
  | { kind: "cat" }
  | { kind: "confirm"; title: string; body: React.ReactNode; yes: string; danger?: boolean; onYes: () => void }
  | { kind: "text"; title: string; text: string }
  | { kind: "add" }
  | { kind: "shift"; shift: Shift | null; date: string }
  | { kind: "payslip"; payslip: Payslip | null }
  | { kind: "workcfg" }
  | null

/* ---------- operaciones sobre un borrador ---------- */
function upsertTx(d: FinanceData, nt: Tx, oldM: string | null) {
  if (oldM) d.months[oldM] = (d.months[oldM] || []).filter((t) => t.id !== nt.id)
  const m = ym(nt.d)
  const arr = (d.months[m] || []).filter((t) => t.id !== nt.id)
  arr.push(nt)
  arr.sort(byDate)
  d.months[m] = arr
  for (const k of Object.keys(d.months)) if (!d.months[k].length) delete d.months[k]
}
function recTx(rec: Recurring, m: string): Tx {
  const day = Math.min(rec.dia || 1, daysIn(m))
  return { id: uid(), k: Date.now(), d: `${m}-${pad(day)}`, t: rec.t, c: rec.c, cat: rec.cat, n: rec.n, rec: rec.id }
}
function insertCat(d: FinanceData, c: Category) {
  const at = d.settings.cats.findIndex((x) => x.id === (c.t === "g" ? "otros-g" : "otros-i"))
  d.settings.cats.splice(at < 0 ? d.settings.cats.length : at, 0, c)
}

async function downloadFile(filename: string, text: string, onFallback: () => void) {
  try {
    const type = /\.json$/i.test(filename) ? "application/json" : "text/csv"
    const url = URL.createObjectURL(new Blob([text], { type: type + ";charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success("Archivo descargado")
  } catch {
    try {
      await navigator.clipboard.writeText(text)
      toast("No se pudo descargar; lo he copiado al portapapeles.")
    } catch {
      onFallback()
    }
  }
}

export function FinanzasApp() {
  const store = useFinance()
  const pwa = usePwa()
  const { real, view: D, showingDemo, loaded, mode, update } = store
  const [view, setView] = React.useState<View>("inicio")
  const [month, setMonth] = React.useState(CUR)
  const [filters, setFilters] = React.useState<Filters>({ q: "", t: "all", cat: "all", all: false })
  const [sheet, setSheet] = React.useState<Sheet>(null)
  const [sheetKey, setSheetKey] = React.useState(0)
  const [last, setLast] = React.useState<{ type: TxType; cat: Partial<Record<TxType, string>> }>({ type: "g", cat: {} })
  const [tour, setTour] = React.useState(false)
  const [buddyOn, setBuddyOn] = React.useState(true)

  /* Orbi: preferencia de mostrarlo y tutorial la primera vez. */
  React.useEffect(() => {
    let done = true
    try {
      done = localStorage.getItem("orbe.tour") === "done"
      // Preferencia guardada en este dispositivo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBuddyOn(localStorage.getItem("orbe.buddy") !== "off")
    } catch {}
    if (done) return
    const t = setTimeout(() => {
      if (location.hash && location.hash !== "#inicio") location.hash = "inicio"
      setTour(true)
    }, 3000)
    return () => clearTimeout(t)
  }, [])
  const toggleBuddy = (on: boolean) => {
    setBuddyOn(on)
    try {
      localStorage.setItem("orbe.buddy", on ? "on" : "off")
    } catch {}
  }
  const startTour = () => {
    setView("inicio")
    if (location.hash !== "#inicio") location.hash = "inicio"
    scrollToY(0, true)
    setTimeout(() => setTour(true), 250)
  }

  const open = (s: NonNullable<Sheet>) => {
    setSheetKey((k) => k + 1)
    setSheet(s)
  }
  const close = () => setSheet(null)
  // Sin smooth scroll de fondo mientras hay un diálogo abierto.
  React.useEffect(() => {
    setScrollLocked(!!sheet || tour)
  }, [sheet, tour])

  /* Navegación con #hash para que el botón atrás del móvil funcione. */
  React.useEffect(() => {
    const read = () => {
      const h = location.hash.slice(1)
      if (h === "nuevo-gasto") {
        history.replaceState(null, "", "#inicio")
        setView("inicio")
        setSheetKey((k) => k + 1)
        setSheet({ kind: "tx", tx: null, type: "g" })
        return
      }
      if (VIEWS.includes(h as View)) setView(h as View)
      else if (!h) setView("inicio")
    }
    read()
    window.addEventListener("hashchange", read)
    return () => window.removeEventListener("hashchange", read)
  }, [])
  const go = (v: View) => {
    setView(v)
    scrollToY(0, true)
    if (location.hash !== "#" + v) location.hash = v
  }

  const guardDemo = () => {
    if (!showingDemo) return false
    toast("Es un ejemplo. Añade algo tuyo o pulsa «Empezar desde cero».")
    return true
  }
  const startFresh = () => {
    update((d) => {
      d.settings.started = true
      d.hasSettings = true
    })
  }

  const defaultDate = () => {
    const cur = CUR()
    if (view === "inicio" || month === cur) return todayStr()
    return month < cur ? `${month}-${pad(daysIn(month))}` : `${month}-01`
  }

  /* ---------- movimientos ---------- */
  const saveTx = ({ tx, oldMonth, newRec }: TxSaveResult) => {
    update((d) => {
      if (newRec) {
        d.settings.recs.push(newRec)
        d.hasSettings = true
      }
      upsertTx(d, tx, oldMonth)
    })
    setLast((l) => ({ type: tx.t, cat: { ...l.cat, [tx.t]: tx.cat } }))
    close()
    const where = ym(tx.d) === CUR() || ym(tx.d) === month ? "" : ` en ${monthLabel(ym(tx.d))}`
    const isNew = !oldMonth
    let said = false
    if (isNew && tx.t === "i")
      said = orbiSay(pick([`¡Dinero dentro! +${eur(tx.c)}${where} 💸`, `¡Eso es! ${eur(tx.c)} más en la cuenta.`, `+${eur(tx.c)}. Mi anillo brilla más que nunca ✨`]), "happy")
    else if (isNew && isHormiga(tx, catMap(real.settings.cats), real.settings.hormigaMax)) {
      const hs = hormigaStats({ ...real, months: { ...real.months, [ym(tx.d)]: [...(real.months[ym(tx.d)] || []), tx] } }, ym(tx.d))
      said = orbiSay(`¡Una hormiga! 🐜 Este mes ya suman ${eur(hs.total)} en ${hs.count} gastitos.`, "wow")
    } else if (isNew)
      said = orbiSay(pick([`Apuntado${where}. ¡Así me gusta!`, `Gasto guardado${where}. Nada se me escapa 👀`, `Hecho${where}. Cuentas claras, ahorro feliz.`]), "idle")
    if (!said) toast.success(where ? `Guardado${where}` : "Guardado")
  }
  const deleteTx = (tx: Tx) => {
    update((d) => {
      const m = ym(tx.d)
      d.months[m] = (d.months[m] || []).filter((t) => t.id !== tx.id)
      if (!d.months[m].length) delete d.months[m]
    })
    close()
    toast("Movimiento eliminado")
  }
  const registerRecs = (rs: Recurring[], m: string) => {
    if (guardDemo()) return
    update((d) => {
      for (const r of rs) upsertTx(d, recTx(r, m), null)
    })
    const msg = rs.length === 1 ? `${rs[0].n} apuntado` : `${rs.length} fijos apuntados`
    if (!orbiSay(`${msg}. Tus fijos, al día ✔`, "happy")) toast.success(msg)
  }
  const setBudget = (catId: string, raw: string) => {
    const v = raw.trim() ? parsePos(raw) : 0
    if (v == null) return toast.error("Escribe un importe válido, por ejemplo 150.")
    update((d) => {
      d.hasSettings = true
      if (v) d.settings.budgets[catId] = v
      else delete d.settings.budgets[catId]
    })
  }
  const setSaldo = (raw: string) => {
    const v = raw.trim() ? parseMoney(raw) : 0
    if (v == null) return toast.error("Escribe un importe válido, por ejemplo 850 o -120.")
    update((d) => {
      d.hasSettings = true
      d.settings.saldoInicial = v
    })
    toast.success("Saldo inicial guardado")
  }

  /* ---------- metas ---------- */
  const saveGoal = (g: Goal) => {
    update((d) => {
      const i = d.goals.findIndex((x) => x.id === g.id)
      if (i >= 0) d.goals[i] = g
      else d.goals.push(g)
    })
    close()
    toast.success("Meta guardada")
  }
  const deleteGoal = (g: Goal) => {
    update((d) => {
      d.goals = d.goals.filter((x) => x.id !== g.id)
    })
    close()
    toast("Meta eliminada")
  }
  const aport = (g: Goal, sign: 1 | -1, c: number) => {
    update((d) => {
      const x = d.goals.find((y) => y.id === g.id)
      if (x) x.ah += sign * c
    })
    close()
    const after = g.ah + sign * c
    const said =
      sign > 0
        ? after >= g.obj && g.ah < g.obj
          ? orbiSay(`¡Meta «${g.n}» conseguida! 🎉 Estoy dando vueltas de alegría.`, "wow")
          : orbiSay(`+${eur(c)} para «${g.n}». Ya vas por el ${Math.round((after / g.obj) * 100)} %. ¡Sigue así!`, "happy")
        : orbiSay(`Has retirado ${eur(c)} de «${g.n}». No pasa nada, a veces toca.`, "think")
    if (!said) toast.success(sign > 0 ? `Has apartado ${eur(c)}` : `Has retirado ${eur(c)}`)
  }

  /* ---------- fijos y categorías ---------- */
  const saveRec = (r: Recurring) => {
    update((d) => {
      d.hasSettings = true
      const i = d.settings.recs.findIndex((x) => x.id === r.id)
      if (i >= 0) d.settings.recs[i] = r
      else d.settings.recs.push(r)
    })
    close()
    toast.success("Fijo guardado")
  }
  const deleteRec = (r: Recurring) => {
    update((d) => {
      d.settings.recs = d.settings.recs.filter((x) => x.id !== r.id)
    })
    close()
    toast("Fijo eliminado. Los movimientos ya apuntados se quedan.")
  }
  const toggleRec = (id: string, on: boolean) =>
    update((d) => {
      const r = d.settings.recs.find((x) => x.id === id)
      if (r) r.on = on
    })
  const saveCat = (c: Category) => {
    update((d) => {
      d.hasSettings = true
      insertCat(d, c)
    })
    close()
    toast.success("Categoría creada")
  }
  const renameCat = (id: string, n: string) =>
    update((d) => {
      d.hasSettings = true
      const c = d.settings.cats.find((x) => x.id === id)
      if (c) c.n = n.slice(0, 40)
    })
  const groupCat = (id: string, g: "nec" | "des") =>
    update((d) => {
      d.hasSettings = true
      const c = d.settings.cats.find((x) => x.id === id)
      if (c) c.g = g
    })
  const deleteCat = (c: Category) => {
    const to = c.t === "g" ? "otros-g" : "otros-i"
    const toName = catMap(real.settings.cats)[to]?.n
    const n = Object.values(real.months)
      .flat()
      .filter((t) => t.cat === c.id).length
    open({
      kind: "confirm",
      title: `Eliminar «${c.n}»`,
      body: n ? `Tienes ${n} movimientos en esta categoría. Pasarán a «${toName}».` : "No tiene movimientos.",
      yes: "Eliminar categoría",
      danger: true,
      onYes: () => {
        update((d) => {
          for (const m of Object.keys(d.months)) d.months[m] = d.months[m].map((t) => (t.cat === c.id ? { ...t, cat: to } : t))
          d.settings.recs = d.settings.recs.map((r) => (r.cat === c.id ? { ...r, cat: to } : r))
          delete d.settings.budgets[c.id]
          d.settings.cats = d.settings.cats.filter((x) => x.id !== c.id)
        })
        close()
        toast("Categoría eliminada")
      },
    })
  }

  /* ---------- copias ---------- */
  const exportCSV = () =>
    downloadFile(`orbe-movimientos-${todayStr()}.csv`, toCSV(real.months, real.settings.cats), () =>
      open({ kind: "text", title: "Movimientos en CSV", text: toCSV(real.months, real.settings.cats) })
    )
  const backupJSON = () =>
    JSON.stringify(
      {
        app: "mis-finanzas",
        v: 2,
        exportado: new Date().toISOString(),
        settings: real.settings,
        goals: real.goals,
        months: real.months,
        work: real.work,
        payslips: real.payslips,
      },
      null,
      1
    )
  const exportJSON = () =>
    downloadFile(`orbe-copia-${todayStr()}.json`, backupJSON(), () => open({ kind: "text", title: "Copia completa", text: backupJSON() }))
  const copyCSV = () => {
    const text = toCSV(real.months, real.settings.cats)
    navigator.clipboard.writeText(text).then(
      () => toast.success("CSV copiado. Pégalo en Excel."),
      () => open({ kind: "text", title: "Movimientos en CSV", text })
    )
  }
  const importFile = (file: File) => {
    if (file.size > 5e6) return toast.error("El archivo es demasiado grande.")
    const rd = new FileReader()
    rd.onerror = () => toast.error("No he podido leer el archivo.")
    rd.onload = () => {
      const text = String(rd.result || "")
      if (/\.json$/i.test(file.name) || /^\s*\{/.test(text)) {
        let obj: Partial<FinanceData> | null = null
        try {
          obj = JSON.parse(text)
        } catch {
          return toast.error("No he podido leer ese archivo JSON.")
        }
        if (!obj || (!obj.settings && !obj.months)) return toast.error("Ese JSON no es una copia de Orbe.")
        const nM = Object.values(obj.months || {}).reduce((a, x) => a + (Array.isArray(x) ? x.length : 0), 0)
        const backup = obj
        open({
          kind: "confirm",
          title: "Restaurar copia completa",
          body: `La copia tiene ${nM} movimientos, ${(backup.goals || []).length} metas, ${(backup.payslips || []).length} nóminas y ${(backup.work?.shifts || []).length} jornadas. Sustituirá todos tus datos actuales.`,
          yes: "Sustituir mis datos",
          danger: true,
          onYes: () => {
            const loadedData = loadAll({ ...backup, hasSettings: true })
            update((d) => Object.assign(d, loadedData))
            close()
            toast.success("Copia restaurada")
          },
        })
        return
      }
      const res = importCSVRows(parseCSV(text), real.settings.cats)
      if ("error" in res) return toast.error(res.error)
      const existing = new Set(Object.values(real.months).flat().map(txKey))
      const fresh = res.txs.filter((t) => !existing.has(txKey(t)))
      const dup = res.txs.length - fresh.length
      if (!fresh.length) return toast(dup ? "Todos esos movimientos ya estaban apuntados." : "No he encontrado movimientos en el archivo.")
      const extra = [
        dup ? `${dup} ya estaban apuntados` : "",
        res.skipped ? `${res.skipped} filas no se entendían` : "",
        res.newCats.length ? `se crearán ${res.newCats.length} categorías nuevas` : "",
      ]
        .filter(Boolean)
        .join(", ")
      open({
        kind: "confirm",
        title: "Importar movimientos",
        body: `Se añadirán ${fresh.length} movimientos${extra ? ` (${extra})` : ""}.`,
        yes: "Importar",
        onYes: () => {
          update((d) => {
            for (const c of res.newCats) insertCat(d, c)
            if (res.newCats.length) d.hasSettings = true
            for (const t of fresh) (d.months[ym(t.d)] ||= []).push(t)
            for (const m of Object.keys(d.months)) d.months[m].sort(byDate)
          })
          close()
          toast.success(`${fresh.length} movimientos importados`)
        },
      })
    }
    rd.readAsText(file)
  }
  const wipe = () =>
    open({
      kind: "confirm",
      title: "¿Borrar todos tus datos?",
      body: "Se eliminarán movimientos, metas, fijos, presupuestos, categorías, jornadas y nóminas. No se puede deshacer. Si quieres conservarlos, descarga antes una copia completa.",
      yes: "Sí, borrar todo",
      danger: true,
      onYes: () => {
        store.wipe()
        close()
        toast("Datos borrados")
      },
    })

  /* ---------- trabajo ---------- */
  const clockToday = () => {
    const cfg = real.work.cfg
    const s: Shift = { id: "s" + uid(), d: todayStr(), kind: "trabajo", ini: cfg.ini, fin: cfg.fin, pausa: cfg.pausa }
    update((d) => {
      d.work.shifts.push(s)
    })
    toast.success(`Jornada de hoy registrada · ${fmtMin(shiftMinutes(s))}`, {
      action: { label: "Editar", onClick: () => open({ kind: "shift", shift: s, date: s.d }) },
    })
    orbiSay(pick(["¡Jornada fichada! Hoy también cuenta 💪", "Fichado. Yo llevo la cuenta de tus horas.", "¡Hecho! Otra jornada a la saca."]), "happy")
  }
  const openDay = (date: string, s: Shift | null) => {
    if (s && guardDemo()) return
    const found = s ? real.work.shifts.find((x) => x.id === s.id) || null : null
    open({ kind: "shift", shift: found, date })
  }
  const saveShift = (s: Shift) => {
    update((d) => {
      const i = d.work.shifts.findIndex((x) => x.id === s.id)
      if (i >= 0) d.work.shifts[i] = s
      else d.work.shifts.push(s)
    })
    close()
    toast.success("Jornada guardada")
  }
  const deleteShift = (s: Shift) => {
    update((d) => {
      d.work.shifts = d.work.shifts.filter((x) => x.id !== s.id)
    })
    close()
    toast("Jornada eliminada")
  }
  const saveWorkCfg = (c: WorkCfg) => {
    update((d) => {
      d.work.cfg = c
      d.hasSettings = true
    })
    close()
    toast.success("Jornada actualizada")
  }
  const savePayslip = ({ p, asIncome }: PayslipSaveResult) => {
    update((d) => {
      const oldTx = p.txId ? Object.values(d.months).flat().find((t) => t.id === p.txId) : undefined
      if (asIncome) {
        const cat = d.settings.cats.some((c) => c.id === "nomina") ? "nomina" : "otros-i"
        const tx: Tx = {
          id: oldTx?.id || uid(),
          k: oldTx?.k || Date.now(),
          d: p.dPago,
          t: "i",
          c: p.neto,
          cat,
          n: `Nómina de ${monthLabel(p.m)}`,
          ps: p.id,
        }
        upsertTx(d, tx, oldTx ? ym(oldTx.d) : null)
        p.txId = tx.id
      } else {
        if (oldTx) {
          const m = ym(oldTx.d)
          d.months[m] = d.months[m].filter((t) => t.id !== oldTx.id)
          if (!d.months[m].length) delete d.months[m]
        }
        delete p.txId
      }
      const i = d.payslips.findIndex((x) => x.id === p.id)
      if (i >= 0) d.payslips[i] = p
      else d.payslips.push(p)
    })
    close()
    const rate = p.bruto && p.irpf ? ` Te retienen un ${Math.round((p.irpf / p.bruto) * 1000) / 10} % de IRPF.` : ""
    if (!orbiSay(`¡Nómina guardada! ${eur(p.neto)} netos.${rate}`, "happy"))
      toast.success(asIncome ? "Nómina guardada y apuntada como ingreso" : "Nómina guardada")
  }
  const deletePayslip = (p: Payslip) => {
    update((d) => {
      d.payslips = d.payslips.filter((x) => x.id !== p.id)
      if (p.txId)
        for (const m of Object.keys(d.months)) {
          d.months[m] = d.months[m].filter((t) => t.id !== p.txId)
          if (!d.months[m].length) delete d.months[m]
        }
    })
    close()
    toast("Nómina eliminada")
  }
  const openPayslip = (p: Payslip | null) => {
    if (p && guardDemo()) return
    open({ kind: "payslip", payslip: p ? real.payslips.find((x) => x.id === p.id) || null : null })
  }
  const setHormigaMax = (raw: string) => {
    const v = parsePos(raw)
    if (v == null) return toast.error("Escribe un importe válido, por ejemplo 10.")
    update((d) => {
      d.hasSettings = true
      d.settings.hormigaMax = v
    })
    toast.success(`Gastos hormiga: hasta ${eur(v)}`)
  }
  const setNombre = (n: string) => {
    update((d) => {
      d.hasSettings = true
      d.settings.nombre = n.trim().slice(0, 30)
    })
    toast.success("Guardado")
  }

  const findTx = (t: Tx) => (real.months[ym(t.d)] || []).find((x) => x.id === t.id)
  const openTx = (t: Tx) => {
    if (guardDemo()) return
    const found = findTx(t)
    if (found) open({ kind: "tx", tx: found })
  }
  const newTx = (type?: TxType) => loaded && open({ kind: "tx", tx: null, type })
  const memory = mode === "memory"
  const showMonth = MONTH_VIEWS.includes(view)
  const tab = tabOf(view)
  const parent = PARENT[view]

  // Extras apuntados en el mes de la nómina que se va a crear (sugerencia).
  const payslipMonth = sheet?.kind === "payslip" ? sheet.payslip?.m || addMonths(CUR(), -1) : addMonths(CUR(), -1)
  const extrasSuggestion = React.useMemo(() => {
    const s = summarize(monthDays(dayTotals(real.work.shifts, real.work.cfg), payslipMonth), real.work.cfg)
    return { min: s.extra, c: s.extraPay }
  }, [real.work, payslipMonth])

  return (
    <>
      <Splash />
      <OrbiTour open={tour} onClose={() => setTour(false)} />
      {loaded ? <OrbiBuddy view={view} data={D} nombre={real.settings.nombre} hidden={!buddyOn || tour} /> : null}
      <SideNav view={view} onGo={(v) => go(v)} onAdd={() => loaded && open({ kind: "add" })} />
      <div className="lg:pl-[260px]">
      <div className="mx-auto max-w-[1080px] px-4 pb-52 lg:px-8 lg:pb-16">
        <header className="pt-safe sticky top-0 z-20 -mx-4 mb-3 bg-background/85 px-4 pb-2 backdrop-blur-xl lg:-mx-8 lg:mb-5 lg:px-8 lg:pt-5 lg:pb-3">
          <div className="flex h-11 items-center justify-between gap-3">
            {view === "inicio" ? (
              <>
                <OrbeWordmark className="lg:hidden" />
                <h1 className="hidden font-heading text-2xl font-semibold tracking-tight lg:block">Inicio</h1>
              </>
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                {parent ? (
                  <Button variant="ghost" size="icon" className="-ml-2 rounded-full lg:hidden" aria-label="Volver" onClick={() => go(parent)}>
                    <ChevronLeftIcon className="size-5" />
                  </Button>
                ) : null}
                <h1 className="truncate font-heading text-xl font-semibold tracking-tight lg:text-2xl">{TITLES[view]}</h1>
              </div>
            )}
            <div className="flex items-center gap-2">
              <StatusPill mode={mode} demo={showingDemo} />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {showMonth ? <MonthBar month={month} setMonth={setMonth} /> : null}

        <main id="view" tabIndex={-1} className="outline-none" key={view}>
          {!loaded ? (
            <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Cargando tus cuentas…</div>
          ) : (
            <>
              <Banners demo={showingDemo} memory={memory} onStart={startFresh} />
              {view === "inicio" ? (
                <HomeView
                  data={D}
                  demo={showingDemo}
                  onNewTx={newTx}
                  onOpenTx={openTx}
                  onGo={(v) => go(v)}
                  onClock={clockToday}
                  onRegisterRec={(r) => registerRecs([r], CUR())}
                  onRegisterAll={(rs) => registerRecs(rs, CUR())}
                />
              ) : view === "resumen" ? (
                <ResumenView
                  data={D}
                  month={month}
                  demo={showingDemo}
                  onMonth={setMonth}
                  onOpenTx={openTx}
                  onNewTx={() => newTx()}
                  onRegisterRec={(r) => registerRecs([r], month)}
                  onRegisterAll={(rs) => registerRecs(rs, month)}
                  onSeeAll={() => go("movimientos")}
                />
              ) : view === "movimientos" ? (
                <MovView data={D} month={month} filters={filters} setFilters={setFilters} onOpenTx={openTx} onNewTx={() => newTx()} />
              ) : view === "presupuesto" ? (
                <PresView data={D} month={month} demo={showingDemo} onBudget={setBudget} />
              ) : view === "metas" ? (
                <MetasView
                  goals={D.goals}
                  onNew={() => open({ kind: "goal", goal: null })}
                  onEdit={(g) => !guardDemo() && open({ kind: "goal", goal: g })}
                  onAport={(g, sign) => !guardDemo() && open({ kind: "aport", goal: g, sign })}
                />
              ) : view === "hormiga" ? (
                <HormigaView data={D} month={month} onOpenTx={openTx} onMax={setHormigaMax} />
              ) : view === "trabajo" || view === "nominas" ? (
                <WorkView
                  data={D}
                  month={month}
                  tab={view === "nominas" ? "nominas" : "jornadas"}
                  onTab={(t) => go(t === "nominas" ? "nominas" : "trabajo")}
                  onDay={openDay}
                  onClock={clockToday}
                  onCfg={() => open({ kind: "workcfg" })}
                  onNewPayslip={() => openPayslip(null)}
                  onEditPayslip={openPayslip}
                />
              ) : view === "mas" ? (
                <MoreView
                  nombre={real.settings.nombre}
                  pwa={pwa}
                  onGo={(v) => go(v)}
                  onNombre={setNombre}
                  buddyOn={buddyOn}
                  onBuddy={toggleBuddy}
                  onTour={startTour}
                />
              ) : (
                <AjustesView
                  data={real}
                  memory={memory}
                  onSaldo={setSaldo}
                  onNewRec={() => open({ kind: "rec", rec: null })}
                  onEditRec={(r) => open({ kind: "rec", rec: r })}
                  onToggleRec={toggleRec}
                  onNewCat={() => open({ kind: "cat" })}
                  onRenameCat={renameCat}
                  onGroupCat={groupCat}
                  onDeleteCat={deleteCat}
                  onExportCSV={exportCSV}
                  onExportJSON={exportJSON}
                  onCopyCSV={copyCSV}
                  onImport={importFile}
                  onWipe={wipe}
                />
              )}
            </>
          )}
        </main>

        <BottomNav tab={tab} onGo={(v) => go(v)} onAdd={() => loaded && open({ kind: "add" })} />

        {/* Diálogos: la key fuerza un formulario limpio cada vez que se abre. */}
        {sheet?.kind === "add" ? (
          <AddSheet
            key={sheetKey}
            onClose={close}
            onPick={(k) => {
              if (k === "g" || k === "i") open({ kind: "tx", tx: null, type: k })
              else if (k === "shift") open({ kind: "shift", shift: null, date: todayStr() })
              else open({ kind: "payslip", payslip: null })
            }}
          />
        ) : null}
        {sheet?.kind === "tx" ? (
          <TxDialog
            key={sheetKey}
            open
            tx={sheet.tx}
            cats={real.settings.cats}
            defaultDate={defaultDate()}
            lastType={sheet.type ?? last.type}
            lastCat={last.cat}
            hormigaMax={real.settings.hormigaMax}
            onClose={close}
            onSave={saveTx}
            onDelete={deleteTx}
          />
        ) : null}
        {sheet?.kind === "shift" ? (
          <ShiftDialog
            key={sheetKey}
            open
            shift={sheet.shift}
            date={sheet.date}
            cfg={real.work.cfg}
            sameDay={real.work.shifts.filter((s) => s.d === (sheet.shift?.d || sheet.date))}
            onClose={close}
            onSave={saveShift}
            onDelete={deleteShift}
          />
        ) : null}
        {sheet?.kind === "payslip" ? (
          <PayslipDialog
            key={sheetKey}
            open
            payslip={sheet.payslip}
            month={CUR()}
            suggestExtras={extrasSuggestion}
            onClose={close}
            onSave={savePayslip}
            onDelete={deletePayslip}
          />
        ) : null}
        {sheet?.kind === "workcfg" ? <WorkCfgDialog key={sheetKey} open cfg={real.work.cfg} onClose={close} onSave={saveWorkCfg} /> : null}
        {sheet?.kind === "goal" ? (
          <GoalDialog key={sheetKey} open goal={sheet.goal} onClose={close} onSave={saveGoal} onDelete={deleteGoal} />
        ) : null}
        {sheet?.kind === "aport" ? (
          <AportDialog key={sheetKey} open goal={sheet.goal} sign={sheet.sign} onClose={close} onSave={(c) => aport(sheet.goal, sheet.sign, c)} />
        ) : null}
        {sheet?.kind === "rec" ? (
          <RecDialog key={sheetKey} open rec={sheet.rec} cats={real.settings.cats} onClose={close} onSave={saveRec} onDelete={deleteRec} />
        ) : null}
        {sheet?.kind === "cat" ? <CatDialog key={sheetKey} open cats={real.settings.cats} onClose={close} onSave={saveCat} /> : null}
        {sheet?.kind === "confirm" ? (
          <ConfirmDialog key={sheetKey} open title={sheet.title} yes={sheet.yes} danger={sheet.danger} onClose={close} onYes={sheet.onYes}>
            {sheet.body}
          </ConfirmDialog>
        ) : null}
        {sheet?.kind === "text" ? <TextDialog key={sheetKey} open title={sheet.title} text={sheet.text} onClose={close} /> : null}
      </div>
      </div>
    </>
  )
}

/* ---------- piezas del armazón ---------- */
function BottomNav({ tab, onGo, onAdd }: { tab: Tab; onGo: (v: View) => void; onAdd: () => void }) {
  const item = (v: Tab, label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <button
      type="button"
      data-tour={`nav-${v}`}
      aria-current={tab === v ? "page" : undefined}
      onClick={() => onGo(v)}
      className={cn(
        "grid min-h-12 justify-items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors",
        tab === v && "text-primary"
      )}
    >
      <Icon className="size-[22px]" />
      {label}
    </button>
  )
  return (
    <nav
      aria-label="Secciones"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end border-t bg-card/95 px-2 pt-1.5 backdrop-blur-xl md:px-[max(0.5rem,calc(50vw-280px))] lg:hidden"
    >
      {item("inicio", "Inicio", HouseIcon)}
      {item("resumen", "Análisis", ChartPieIcon)}
      <div className="grid justify-items-center">
        <button
          type="button"
          data-tour="nav-add"
          aria-label="Añadir"
          onClick={onAdd}
          className="-mt-7 grid size-15 place-items-center rounded-full bg-hero text-glow shadow-[0_10px_24px_-6px_rgb(13_138_158/0.7)] ring-4 ring-background transition-transform active:scale-95"
        >
          <span className="grid size-12 place-items-center rounded-full ring-2 ring-glow/70">
            <PlusIcon className="size-6" strokeWidth={2.4} />
          </span>
        </button>
      </div>
      {item("trabajo", "Trabajo", ClockIcon)}
      {item("mas", "Más", EllipsisIcon)}
    </nav>
  )
}

const SIDE: { v: View; label: string; Icon: React.ComponentType<{ className?: string }>; tour?: string }[] = [
  { v: "inicio", label: "Inicio", Icon: HouseIcon, tour: "nav-inicio" },
  { v: "resumen", label: "Análisis", Icon: ChartPieIcon, tour: "nav-resumen" },
  { v: "movimientos", label: "Movimientos", Icon: ListIcon },
  { v: "trabajo", label: "Trabajo", Icon: ClockIcon, tour: "nav-trabajo" },
  { v: "nominas", label: "Nóminas", Icon: FileTextIcon },
  { v: "hormiga", label: "Gastos hormiga", Icon: BugIcon },
  { v: "presupuesto", label: "Presupuestos", Icon: TargetIcon },
  { v: "metas", label: "Ahorro y metas", Icon: PiggyBankIcon },
]

/** Navegación lateral de escritorio (desde 1024 px). */
function SideNav({ view, onGo, onAdd }: { view: View; onGo: (v: View) => void; onAdd: () => void }) {
  const link = (v: View, label: string, Icon: React.ComponentType<{ className?: string }>, tour?: string) => (
    <button
      key={v}
      type="button"
      data-tour={tour}
      aria-current={view === v ? "page" : undefined}
      onClick={() => onGo(v)}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        view === v && "bg-hero text-hero-foreground hover:bg-hero hover:text-hero-foreground"
      )}
    >
      <Icon className={cn("size-[18px]", view === v && "text-glow")} />
      {label}
    </button>
  )
  return (
    <aside
      aria-label="Secciones"
      className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col gap-6 border-r bg-card/70 px-4 pt-6 pb-5 backdrop-blur-xl lg:flex"
    >
      <div className="px-2">
        <OrbeWordmark />
      </div>
      <Button data-tour="nav-add" onClick={onAdd} className="h-11 justify-start gap-2.5 rounded-2xl bg-hero px-4 text-[15px] text-hero-foreground hover:bg-hero/90">
        <span className="grid size-6 place-items-center rounded-full ring-2 ring-glow/70">
          <PlusIcon className="size-4 text-glow" strokeWidth={2.6} />
        </span>
        Añadir
      </Button>
      <nav className="grid gap-1">{SIDE.map((x) => link(x.v, x.label, x.Icon, x.tour))}</nav>
      <div className="mt-auto grid gap-1 border-t pt-4">
        {link("mas", "Orbi e instalar", SparklesIcon, "nav-mas")}
        {link("ajustes", "Ajustes y copias", SlidersHorizontalIcon)}
      </div>
    </aside>
  )
}

function AddSheet({ onClose, onPick }: { onClose: () => void; onPick: (k: "g" | "i" | "shift" | "payslip") => void }) {
  const opts = [
    { k: "g", label: "Gasto", sub: "Compra, factura, café…", Icon: ArrowUpRightIcon, cls: "bg-out/12 text-out" },
    { k: "i", label: "Ingreso", sub: "Nómina, bizum, extra…", Icon: ArrowDownLeftIcon, cls: "bg-in/12 text-in" },
    { k: "shift", label: "Jornada", sub: "Horas trabajadas", Icon: ClockIcon, cls: "bg-primary/12 text-primary" },
    { k: "payslip", label: "Nómina", sub: "Bruto, IRPF y neto", Icon: FileTextIcon, cls: "bg-gold/25 text-[#8a5a00] dark:text-gold" },
  ] as const
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">¿Qué quieres apuntar?</DialogTitle>
          <DialogDescription>Elige y rellena en segundos.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2.5">
          {opts.map(({ k, label, sub, Icon, cls }) => (
            <button
              key={k}
              type="button"
              onClick={() => onPick(k)}
              className="grid gap-2.5 rounded-2xl bg-muted/60 p-4 text-left ring-1 ring-foreground/5 transition-transform active:scale-[0.97]"
            >
              <span className={cn("grid size-11 place-items-center rounded-2xl", cls)}>
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">{sub}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatusPill({ mode, demo }: { mode: string; demo: boolean }) {
  const [dot, txt] =
    mode === "loading"
      ? ["bg-muted-foreground", "Cargando…"]
      : demo
        ? ["bg-gold", "Ejemplo"]
        : mode === "local"
          ? ["bg-good", "Guardado"]
          : ["bg-bad", "Sin guardar"]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-muted-foreground ring-1 ring-foreground/8">
      <i className={cn("size-1.5 rounded-full", dot)} />
      {txt}
    </span>
  )
}

function MonthBar({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl bg-card p-1.5 ring-1 ring-foreground/8">
      <Button variant="ghost" size="icon" className="size-10 rounded-xl" aria-label="Mes anterior" onClick={() => setMonth(addMonths(month, -1))}>
        <ChevronLeftIcon />
      </Button>
      <div className="grid min-w-0 justify-items-center">
        <span className="font-heading text-base font-semibold tracking-tight first-letter:uppercase">{monthLabel(month)}</span>
        {month !== CUR() ? (
          <button type="button" className="text-[11px] font-medium text-primary" onClick={() => setMonth(CUR())}>
            Volver a este mes
          </button>
        ) : null}
      </div>
      <Button variant="ghost" size="icon" className="size-10 rounded-xl" aria-label="Mes siguiente" onClick={() => setMonth(addMonths(month, 1))}>
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
