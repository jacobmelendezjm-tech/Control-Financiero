"use client"

import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  ListIcon,
  MoonIcon,
  PieChartIcon,
  PlusIcon,
  ReceiptTextIcon,
  SlidersHorizontalIcon,
  SunIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import {
  CUR,
  addMonths,
  byDate,
  catMap,
  daysIn,
  eur,
  importCSVRows,
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
  type Recurring,
  type Tx,
  type TxType,
} from "@/lib/finance"
import { cn } from "@/lib/utils"

const VIEWS = ["resumen", "movimientos", "presupuesto", "metas", "ajustes"] as const
type View = (typeof VIEWS)[number]
const MONTH_VIEWS: View[] = ["resumen", "movimientos", "presupuesto"]
const NAV: { v: View; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { v: "resumen", label: "Resumen", Icon: ReceiptTextIcon },
  { v: "movimientos", label: "Movimientos", Icon: ListIcon },
  { v: "presupuesto", label: "Presupuesto", Icon: PieChartIcon },
  { v: "metas", label: "Metas", Icon: FlagIcon },
  { v: "ajustes", label: "Ajustes", Icon: SlidersHorizontalIcon },
]

type Sheet =
  | { kind: "tx"; tx: Tx | null }
  | { kind: "goal"; goal: Goal | null }
  | { kind: "aport"; goal: Goal; sign: 1 | -1 }
  | { kind: "rec"; rec: Recurring | null }
  | { kind: "cat" }
  | { kind: "confirm"; title: string; body: React.ReactNode; yes: string; danger?: boolean; onYes: () => void }
  | { kind: "text"; title: string; text: string }
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
  const { real, view: D, showingDemo, loaded, mode, update } = store
  const [view, setView] = React.useState<View>("resumen")
  const [month, setMonth] = React.useState(CUR)
  const [filters, setFilters] = React.useState<Filters>({ q: "", t: "all", cat: "all", all: false })
  const [sheet, setSheet] = React.useState<Sheet>(null)
  const [sheetKey, setSheetKey] = React.useState(0)
  const [last, setLast] = React.useState<{ type: TxType; cat: Partial<Record<TxType, string>> }>({ type: "g", cat: {} })

  /* Navegación con #hash para que el botón atrás funcione. */
  React.useEffect(() => {
    const read = () => {
      const v = location.hash.slice(1) as View
      if (VIEWS.includes(v)) setView(v)
    }
    read()
    window.addEventListener("hashchange", read)
    return () => window.removeEventListener("hashchange", read)
  }, [])
  const go = (v: View) => {
    setView(v)
    window.scrollTo(0, 0)
    if (location.hash !== "#" + v) location.hash = v
  }

  const open = (s: NonNullable<Sheet>) => {
    setSheetKey((k) => k + 1)
    setSheet(s)
  }
  const close = () => setSheet(null)

  const guardDemo = () => {
    if (!showingDemo) return false
    toast("Es un ejemplo. Pulsa «Añadir» para apuntar lo tuyo o «Empezar desde cero».")
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
    if (month === cur) return todayStr()
    return month < cur ? `${month}-${pad(daysIn(month))}` : `${month}-01`
  }

  /* ---------- acciones ---------- */
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
    toast.success(ym(tx.d) === month ? "Guardado" : `Guardado en ${monthLabel(ym(tx.d))}`)
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
  const registerRecs = (rs: Recurring[]) => {
    if (guardDemo()) return
    update((d) => {
      for (const r of rs) upsertTx(d, recTx(r, month), null)
    })
    toast.success(rs.length === 1 ? `${rs[0].n} apuntado` : `${rs.length} fijos apuntados`)
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
    toast.success(sign > 0 ? `Has apartado ${eur(c)}` : `Has retirado ${eur(c)}`)
  }
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
  const exportCSV = () =>
    downloadFile(`mis-finanzas-${todayStr()}.csv`, toCSV(real.months, real.settings.cats), () =>
      open({ kind: "text", title: "Movimientos en CSV", text: toCSV(real.months, real.settings.cats) })
    )
  const backupJSON = () =>
    JSON.stringify(
      { app: "mis-finanzas", v: 1, exportado: new Date().toISOString(), settings: real.settings, goals: real.goals, months: real.months },
      null,
      1
    )
  const exportJSON = () =>
    downloadFile(`mis-finanzas-copia-${todayStr()}.json`, backupJSON(), () =>
      open({ kind: "text", title: "Copia completa", text: backupJSON() })
    )
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
        if (!obj || (!obj.settings && !obj.months)) return toast.error("Ese JSON no es una copia de Mis finanzas.")
        const nM = Object.values(obj.months || {}).reduce((a, x) => a + (Array.isArray(x) ? x.length : 0), 0)
        const backup = obj
        open({
          kind: "confirm",
          title: "Restaurar copia completa",
          body: `La copia tiene ${nM} movimientos y ${(backup.goals || []).length} metas. Sustituirá todos tus datos actuales.`,
          yes: "Sustituir mis datos",
          danger: true,
          onYes: () => {
            const loaded = loadAll({ ...backup, hasSettings: true })
            update((d) => Object.assign(d, loaded))
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
      if (!fresh.length)
        return toast(dup ? "Todos esos movimientos ya estaban apuntados." : "No he encontrado movimientos en el archivo.")
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
      body: "Se eliminarán todos tus movimientos, metas, fijos, presupuestos y categorías. No se puede deshacer. Si quieres conservarlos, descarga antes una copia completa.",
      yes: "Sí, borrar todo",
      danger: true,
      onYes: () => {
        store.wipe()
        close()
        toast("Datos borrados")
      },
    })

  const findTx = (t: Tx) => (real.months[ym(t.d)] || []).find((x) => x.id === t.id)
  const openTx = (t: Tx) => {
    if (guardDemo()) return
    const found = findTx(t)
    if (found) open({ kind: "tx", tx: found })
  }
  const newTx = () => loaded && open({ kind: "tx", tx: null })
  const memory = mode === "memory"
  const showMonth = MONTH_VIEWS.includes(view)

  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-40">
      <Header mode={mode} />
      {showMonth ? <MonthBar month={month} setMonth={setMonth} /> : null}

      <main id="view" tabIndex={-1} className="outline-none">
        {!loaded ? (
          <div className="grid min-h-[50vh] place-items-center font-mono text-sm tracking-wider text-muted-foreground">
            Cargando tus cuentas…
          </div>
        ) : (
          <>
            <Banners demo={showingDemo} memory={memory} onStart={startFresh} />
            {view === "resumen" ? (
              <ResumenView
                data={D}
                month={month}
                demo={showingDemo}
                onMonth={setMonth}
                onOpenTx={openTx}
                onNewTx={newTx}
                onRegisterRec={(r) => registerRecs([r])}
                onRegisterAll={registerRecs}
                onSeeAll={() => go("movimientos")}
              />
            ) : view === "movimientos" ? (
              <MovView data={D} month={month} filters={filters} setFilters={setFilters} onOpenTx={openTx} onNewTx={newTx} />
            ) : view === "presupuesto" ? (
              <PresView data={D} month={month} demo={showingDemo} onBudget={setBudget} />
            ) : view === "metas" ? (
              <MetasView
                goals={D.goals}
                onNew={() => open({ kind: "goal", goal: null })}
                onEdit={(g) => !guardDemo() && open({ kind: "goal", goal: g })}
                onAport={(g, sign) => !guardDemo() && open({ kind: "aport", goal: g, sign })}
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

      {showMonth && loaded ? (
        <Button
          onClick={newTx}
          className="fixed right-4 bottom-21 z-30 h-14 gap-2 rounded-2xl pr-5 pl-4 text-base shadow-lg md:right-6 md:bottom-6"
        >
          <PlusIcon className="size-5" strokeWidth={2.4} />
          Añadir
        </Button>
      ) : null}

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-card px-1 pt-1.5 pb-2.5 md:inset-x-auto md:bottom-4 md:left-1/2 md:w-[560px] md:-translate-x-1/2 md:rounded-2xl md:border md:p-1.5 md:shadow-lg"
      >
        {NAV.map(({ v, label, Icon }) => (
          <button
            key={v}
            type="button"
            aria-current={view === v ? "page" : undefined}
            onClick={() => go(v)}
            className={cn(
              "grid justify-items-center gap-1 rounded-lg px-0.5 py-1.5 text-[11px] font-semibold text-muted-foreground md:text-xs",
              view === v && "text-primary"
            )}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </nav>

      {/* Diálogos: la key fuerza un formulario limpio cada vez que se abre. */}
      {sheet?.kind === "tx" ? (
        <TxDialog
          key={sheetKey}
          open
          tx={sheet.tx}
          cats={real.settings.cats}
          defaultDate={defaultDate()}
          lastType={last.type}
          lastCat={last.cat}
          onClose={close}
          onSave={saveTx}
          onDelete={deleteTx}
        />
      ) : null}
      {sheet?.kind === "goal" ? (
        <GoalDialog key={sheetKey} open goal={sheet.goal} onClose={close} onSave={saveGoal} onDelete={deleteGoal} />
      ) : null}
      {sheet?.kind === "aport" ? (
        <AportDialog
          key={sheetKey}
          open
          goal={sheet.goal}
          sign={sheet.sign}
          onClose={close}
          onSave={(c) => aport(sheet.goal, sheet.sign, c)}
        />
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
  )
}

function Header({ mode }: { mode: string }) {
  return (
    <header className="sticky top-0 z-10 -mx-4 mb-2 bg-background/90 px-4 pt-3 pb-2 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-baseline gap-2 font-heading text-base font-extrabold tracking-tight whitespace-nowrap">
          Mis finanzas
          <small className="hidden font-mono text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase min-[440px]:inline">
            caja personal
          </small>
        </span>
        <div className="flex items-center gap-2">
          <StatusPill mode={mode} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

function StatusPill({ mode }: { mode: string }) {
  const [dot, txt] =
    mode === "loading"
      ? ["bg-muted-foreground", "Cargando…"]
      : mode === "local"
        ? ["bg-good", "Guardado en este navegador"]
        : ["bg-bad", "Sin guardar"]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
      <i className={cn("size-1.5 rounded-full", dot)} />
      <span className="hidden sm:inline">{txt}</span>
      <span className="sm:hidden">{mode === "local" ? "Guardado" : txt}</span>
    </span>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Cambiar tema claro u oscuro"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  )
}

function MonthBar({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  return (
    <div className="mb-3 grid grid-cols-[44px_1fr_44px] items-center gap-2">
      <Button variant="outline" size="icon-lg" className="size-11" aria-label="Mes anterior" onClick={() => setMonth(addMonths(month, -1))}>
        <ChevronLeftIcon />
      </Button>
      <div className="grid min-w-0 justify-items-center">
        <h1 className="text-center font-heading text-[clamp(1.45rem,5.4vw,2rem)] leading-tight font-bold tracking-tight first-letter:uppercase">
          {monthLabel(month)}
        </h1>
        {month !== CUR() ? (
          <Button variant="link" size="sm" className="h-6" onClick={() => setMonth(CUR())}>
            Volver a este mes
          </Button>
        ) : null}
      </div>
      <Button variant="outline" size="icon-lg" className="size-11" aria-label="Mes siguiente" onClick={() => setMonth(addMonths(month, 1))}>
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
