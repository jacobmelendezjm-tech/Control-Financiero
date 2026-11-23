"use client"

import * as React from "react"
import { CheckIcon, MinusIcon, TriangleAlertIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { NativeSelect } from "@/components/finanzas/dialogs"
import {
  addMonths,
  balanceUpTo,
  budgetRows,
  budgetState,
  byCategory,
  byDate,
  cap,
  catMap,
  CUR,
  dayLabel,
  daysIn,
  eur,
  eur0,
  eurM,
  eurS,
  fmtPlain,
  MINUS,
  MONEDAS,
  monthLabel,
  monthsBetween,
  monthShort,
  monthStats,
  niceScale,
  norm,
  pct,
  pendingRecs,
  projection,
  rule503020,
  sim,
  type BudgetState,
  type Category,
  type FinanceData,
  type Goal,
  type Moneda,
  type Recurring,
  type Tx,
  type TxType,
} from "@/lib/finance"
import { cn } from "@/lib/utils"

/* ---------- piezas ---------- */
const STATE_BAR: Record<BudgetState, string> = {
  ok: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
  none: "bg-muted-foreground/50",
}

function Bar({ value, marker, state, className }: { value: number; marker?: number; state?: BudgetState | "out"; className?: string }) {
  const fill = state === "out" || !state ? "bg-out" : STATE_BAR[state]
  return (
    <div className={cn("relative my-1.5 h-2.5 rounded-full bg-muted", className)}>
      <i
        className={cn("absolute inset-y-0 left-0 min-w-1 rounded-full", fill)}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
      {marker != null ? (
        <b
          aria-hidden
          className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-sm bg-foreground"
          style={{ left: `${Math.max(0, Math.min(1, marker)) * 100}%` }}
        />
      ) : null}
    </div>
  )
}

export function StateChip({ state, label }: { state: BudgetState; label?: string }) {
  const def = { ok: "Bien", warn: "Cerca del límite", bad: "Te has pasado", none: "Sin límite" }[state]
  const Icon = state === "ok" ? CheckIcon : state === "none" ? MinusIcon : TriangleAlertIcon
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <span
        className={cn(
          "grid size-4 place-items-center rounded-full text-white",
          state === "ok" && "bg-good",
          state === "warn" && "bg-warn text-black",
          state === "bad" && "bg-bad",
          state === "none" && "bg-muted-foreground"
        )}
        aria-hidden
      >
        <Icon className="size-2.5" strokeWidth={3} />
      </span>
      {label ?? def}
    </span>
  )
}

function Empty({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="px-3 py-8 text-center text-muted-foreground">
      <strong className="mb-1.5 block font-heading text-base text-foreground">{title}</strong>
      <p className="mx-auto mb-4 max-w-[34ch] text-sm">{text}</p>
      {children}
    </div>
  )
}

function TxRow({ t, cm, onOpen }: { t: Tx; cm: Record<string, Category>; onOpen: (t: Tx) => void }) {
  const c = cm[t.cat]
  return (
    <li className="border-t first:border-t-0">
      <button
        type="button"
        onClick={() => onOpen(t)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
      >
        <span className="grid min-w-0 flex-1">
          <span className="font-medium leading-snug">{c ? c.n : "Sin categoría"}</span>
          {t.n ? <span className="truncate text-sm text-muted-foreground">{t.n}</span> : null}
        </span>
        {t.rec ? (
          <Badge variant="outline" className="font-heading tabular-nums text-[10px] uppercase tracking-wider">
            Fijo
          </Badge>
        ) : null}
        <span className={cn("font-heading tabular-nums font-semibold whitespace-nowrap", t.t === "i" && "text-pos")}>
          {t.t === "i" ? "+" : MINUS}
          {eur(t.c)}
        </span>
      </button>
    </li>
  )
}

function DemoBanner({ onStart }: { onStart: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-full bg-card/80 py-1.5 pr-1.5 pl-4 text-sm ring-1 ring-foreground/10 backdrop-blur-xl lg:backdrop-blur-none">
      <span className="flex items-center gap-2 font-medium">
        <i aria-hidden className="size-2 animate-pulse rounded-full bg-gold" /> Datos de ejemplo
      </span>
      <Button size="sm" className="rounded-full" onClick={onStart}>
        Empezar
      </Button>
    </div>
  )
}

export function Banners({ demo, memory, onStart }: { demo: boolean; memory: boolean; onStart: () => void }) {
  return (
    <>
      {demo ? <DemoBanner onStart={onStart} /> : null}
      {memory ? (
        <div className="mb-4 rounded-xl border border-warn/50 bg-warn/15 px-4 py-3 text-sm">
          Este navegador no deja guardar datos: si cierras la página se perderán. Descarga una copia en Ajustes antes de
          salir.
        </div>
      ) : null}
    </>
  )
}

const ViewTitle = ({ children }: { children: React.ReactNode }) => (
  // La cabecera de la app ya muestra el título: aquí solo para lectores de pantalla.
  <h2 className="sr-only">{children}</h2>
)

/* ---------- Resumen ---------- */
export function ResumenView({
  data,
  month,
  demo,
  onMonth,
  onOpenTx,
  onNewTx,
  onRegisterRec,
  onRegisterAll,
  onSeeAll,
}: {
  data: FinanceData
  month: string
  demo: boolean
  onMonth: (m: string) => void
  onOpenTx: (t: Tx) => void
  onNewTx: () => void
  onRegisterRec: (r: Recurring) => void
  onRegisterAll: (rs: Recurring[]) => void
  onSeeAll: () => void
}) {
  const txs = data.months[month] || []
  const st = monthStats(txs)
  const cm = catMap(data.settings.cats)
  const total = balanceUpTo(data.months, data.settings.saldoInicial, month)
  const pend = pendingRecs(data.settings.recs, txs)
  const isCur = month === CUR()
  const day = new Date().getDate()
  const proj = isCur && day >= 3 && st.exp > 0 ? projection(txs, pend, month, day) : null
  const neg = st.bal < 0
  const r = rule503020(txs, data.settings.cats)
  const cats = byCategory(txs, "g")

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="grid min-w-0 content-start gap-4">
        {/* Ticket del mes */}
        <Card className="relative overflow-visible font-mono shadow-md" aria-label={`Resumen de ${monthLabel(month)}`}>
          <CardContent className="pb-2">
            <div className="flex justify-between border-b border-dashed pb-3 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              <span>Ticket del mes</span>
              <span>{demo ? "Ejemplo" : month.split("-").reverse().join("/")}</span>
            </div>
            <p className="mt-4 mb-1 font-sans text-sm text-muted-foreground">
              {!txs.length ? "Aún no hay nada apuntado este mes" : neg ? "Este mes vas en negativo" : "Te queda este mes"}
            </p>
            <p
              className={cn(
                "mb-4 font-heading text-[clamp(2.5rem,11vw,3.5rem)] leading-none font-extrabold tracking-tight tabular-nums [overflow-wrap:anywhere]",
                neg && "text-destructive"
              )}
            >
              {eurS(st.bal)}
            </p>
            <dl className="grid gap-1.5 text-sm">
              <Row k="Ingresos" v={eur(st.inc)} />
              <Row k="Gastos" v={(st.exp ? MINUS : "") + eur(st.exp)} />
              <div className="my-1 border-t border-dashed" role="presentation" />
              <Row k="Ahorras" v={pct(st.rate)} />
              <Row k="Saldo acumulado" v={eurM(total)} />
            </dl>
            {proj ? (
              <p className="mt-4 font-sans text-sm text-muted-foreground">
                Gasto variable medio: <b className="font-heading tabular-nums text-foreground">{eur(proj.avg)}</b> al día. A este ritmo,
                cerrarás el mes con unos <b className="font-heading tabular-nums text-foreground">{eur0(proj.total)}</b> de gastos.
              </p>
            ) : null}
            <p className="mt-5 text-center text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
              {txs.length} {txs.length === 1 ? "movimiento" : "movimientos"} · gracias por apuntar
            </p>
          </CardContent>
        </Card>

        {pend.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Fijos sin apuntar</CardTitle>
              <CardAction>
                <Button size="sm" onClick={() => onRegisterAll(pend)}>
                  Apuntar todos
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {pend.map((rc) => (
                  <li key={rc.id} className="flex flex-wrap items-center gap-2 py-2.5">
                    <span className="min-w-0 flex-[1_1_140px]">
                      <b className="font-medium">{rc.n}</b>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {cm[rc.cat]?.n || ""} · día {rc.dia}
                      </span>
                    </span>
                    <span className="font-heading tabular-nums text-sm font-semibold">
                      {rc.t === "i" ? "+" : MINUS}
                      {eur(rc.c)}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => onRegisterRec(rc)}>
                      Apuntar
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                En total, {eurS(pend.reduce((a, x) => a + (x.t === "i" ? x.c : -x.c), 0))} este mes.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Regla 50/30/20</CardTitle>
          </CardHeader>
          <CardContent>
            {!r.inc ? (
              <p className="text-sm text-muted-foreground">
                Apunta lo que cobras este mes y verás cómo repartes el dinero entre lo necesario, los caprichos y el
                ahorro.
              </p>
            ) : (
              <>
                <ul className="grid gap-3.5">
                  {(
                    [
                      ["Necesidades", r.nec / r.inc, 0.5, "max", "hasta el 50 %"],
                      ["Deseos", r.des / r.inc, 0.3, "max", "hasta el 30 %"],
                      ["Ahorro", r.aho / r.inc, 0.2, "min", "al menos el 20 %"],
                    ] as const
                  ).map(([n, v, t, kind, txt]) => {
                    const s: BudgetState =
                      kind === "max" ? (v <= t ? "ok" : v <= t + 0.1 ? "warn" : "bad") : v >= t ? "ok" : v >= 0 ? "warn" : "bad"
                    const lab =
                      s === "ok" ? "En objetivo" : s === "warn" ? (kind === "min" ? "Por debajo" : "Algo por encima") : "Lejos del objetivo"
                    return (
                      <li key={n}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium">{n}</span>
                          <span className="font-heading tabular-nums text-sm font-semibold">{pct(v)}</span>
                        </div>
                        <div role="img" aria-label={`${n}: ${pct(v)} de tus ingresos, objetivo ${txt}`}>
                          <Bar value={v} marker={t} state={s} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                          <StateChip state={s} label={lab} />
                          <span>Objetivo: {txt} · la raya marca el límite</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Puedes decidir qué categorías son necesidad o deseo en Ajustes.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>¿En qué se va el dinero?</CardTitle>
            {cats.length ? (
              <CardAction className="font-heading tabular-nums text-sm text-muted-foreground">{eur(st.exp)}</CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {!cats.length ? (
              <p className="text-sm text-muted-foreground">
                Cuando apuntes gastos este mes, aquí verás qué categorías se llevan más.
              </p>
            ) : (
              <CategoryBars cats={cats} cm={cm} budgets={data.settings.budgets} total={st.exp} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos 6 meses</CardTitle>
            <CardAction className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <i className="size-2.5 rounded-[3px] bg-in" />
                Ingresos
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2.5 rounded-[3px] bg-out" />
                Gastos
              </span>
            </CardAction>
          </CardHeader>
          <CardContent>
            <SixMonthChart data={data} month={month} onMonth={onMonth} />
          </CardContent>
        </Card>

        <Card className="gap-0 pb-0">
          <CardHeader className="pb-3">
            <CardTitle>Últimos movimientos</CardTitle>
            {txs.length > 5 ? (
              <CardAction>
                <Button variant="link" size="sm" onClick={onSeeAll}>
                  Ver todos
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          {txs.length ? (
            <ul className="border-t">
              {txs.slice(0, 5).map((t) => (
                <TxRow key={t.id} t={t} cm={cm} onOpen={onOpenTx} />
              ))}
            </ul>
          ) : (
            <Empty title="Nada apuntado en este mes" text="Empieza por tu nómina o por el último café que pagaste.">
              <Button onClick={onNewTx}>Añadir movimiento</Button>
            </Empty>
          )}
        </Card>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium tabular-nums">{v}</dd>
    </div>
  )
}

function CategoryBars({
  cats,
  cm,
  budgets,
  total,
}: {
  cats: { cat: string; c: number }[]
  cm: Record<string, Category>
  budgets: Record<string, number>
  total: number
}) {
  const max = Math.max(...cats.map((c) => Math.max(c.c, budgets[c.cat] || 0)))
  return (
    <ul className="grid gap-3.5">
      {cats.map((c) => {
        const lim = budgets[c.cat] || 0
        return (
          <li key={c.cat}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{cm[c.cat]?.n || "Sin categoría"}</span>
              <span className="font-heading tabular-nums text-sm font-semibold whitespace-nowrap">{eur(c.c)}</span>
            </div>
            <Bar value={c.c / max} marker={lim ? lim / max : undefined} />
            <div className="flex flex-wrap gap-2.5 text-xs text-muted-foreground">
              <span>{pct(c.c / total)} del gasto</span>
              {lim ? <span>límite {eur(lim)} (la raya)</span> : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function chartWindow(month: string) {
  let end = CUR()
  if (month > end) end = month
  if (monthsBetween(month, end) > 5) end = addMonths(month, 5)
  const out: string[] = []
  for (let k = 5; k >= 0; k--) out.push(addMonths(end, -k))
  return out
}

function SixMonthChart({ data, month, onMonth }: { data: FinanceData; month: string; onMonth: (m: string) => void }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [W, setW] = React.useState(320)
  const [hover, setHover] = React.useState<string | null>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(280, Math.floor(el.clientWidth || 320))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const series = chartWindow(month).map((m) => {
    const st = monthStats(data.months[m] || [])
    return { m, inc: st.inc, exp: st.exp }
  })
  const H = 190,
    pl = 46,
    pr = 6,
    pt = 10,
    pb = 26
  const max = Math.max(0, ...series.flatMap((s) => [s.inc, s.exp]))
  const { top, step } = niceScale(max, 3)
  const ih = H - pt - pb,
    iw = W - pl - pr,
    base = pt + ih
  const y = (v: number) => base - (v / top) * ih
  const gw = iw / series.length,
    bw = Math.max(6, Math.min(22, (gw - 16) / 2))
  const bar = (x: number, v: number, cls: string, key: string) => {
    if (v <= 0) return null
    const hgt = (v / top) * ih,
      r = Math.min(4, bw / 2, hgt),
      yt = base - hgt
    return (
      <path
        key={key}
        className={cls}
        d={`M${x},${base} V${yt + r} Q${x},${yt} ${x + r},${yt} H${x + bw - r} Q${x + bw},${yt} ${x + bw},${yt + r} V${base} Z`}
      />
    )
  }
  const ticks: number[] = []
  for (let v = 0; v <= top + 0.5; v += step) ticks.push(v)
  const hs = series.find((s) => s.m === hover)
  const hi = hs ? series.indexOf(hs) : -1

  return (
    <>
      <div ref={ref} className="relative min-h-[190px]" onPointerLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          role="img"
          aria-label="Ingresos y gastos de los últimos 6 meses"
          className="block max-w-full overflow-visible"
        >
          {series.map((s, i) =>
            s.m === month ? (
              <rect key="band" className="fill-muted" x={pl + gw * i + 2} y={pt - 4} width={gw - 4} height={ih + 4} rx={8} />
            ) : null
          )}
          {ticks.map((v) => (
            <g key={v}>
              <line className={v === 0 ? "stroke-border" : "stroke-border/60"} x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} />
              <text className="fill-muted-foreground font-heading tabular-nums text-[10px]" x={pl - 6} y={y(v) + 3.5} textAnchor="end">
                {eur0(v)}
              </text>
            </g>
          ))}
          {series.map((s, i) => {
            const cx = pl + gw * i + gw / 2,
              sel = s.m === month
            return (
              <g key={s.m}>
                {bar(cx - bw - 1, s.inc, "fill-in", "i")}
                {bar(cx + 1, s.exp, "fill-out", "o")}
                <text
                  className={cn("text-[11px]", sel ? "fill-foreground font-bold" : "fill-muted-foreground font-semibold")}
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                >
                  {monthShort(s.m)}
                </text>
                <rect
                  x={cx - gw / 2}
                  y={0}
                  width={gw}
                  height={H}
                  fill="transparent"
                  className="cursor-pointer"
                  onPointerMove={() => setHover(s.m)}
                  onClick={() => s.m !== month && onMonth(s.m)}
                />
              </g>
            )
          })}
        </svg>
        {hs ? (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-2 font-heading tabular-nums text-xs leading-relaxed whitespace-nowrap text-background"
            style={{ left: Math.min(Math.max(pl + gw * hi + gw / 2, 90), W - 90) }}
          >
            <strong>{cap(monthLabel(hs.m))}</strong>
            <br />
            Ingresos {eur(hs.inc)}
            <br />
            Gastos {eur(hs.exp)}
            <br />
            Balance {eurS(hs.inc - hs.exp)}
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Toca un mes para verlo arriba.</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-semibold text-primary">Ver como tabla</summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full border-collapse font-heading tabular-nums text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                {["Mes", "Ingresos", "Gastos", "Balance"].map((h, i) => (
                  <th key={h} className={cn("border-b px-1 py-1.5 font-sans", i ? "text-right" : "text-left")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.m}>
                  <td className="border-b px-1 py-1.5 whitespace-nowrap">{cap(monthLabel(s.m))}</td>
                  <td className="border-b px-1 py-1.5 text-right">{eur(s.inc)}</td>
                  <td className="border-b px-1 py-1.5 text-right">{eur(s.exp)}</td>
                  <td className="border-b px-1 py-1.5 text-right">{eurS(s.inc - s.exp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  )
}

/* ---------- Movimientos ---------- */
export interface Filters {
  q: string
  t: "all" | TxType
  cat: string
  all: boolean
}

export function MovView({
  data,
  month,
  filters,
  setFilters,
  onOpenTx,
  onNewTx,
}: {
  data: FinanceData
  month: string
  filters: Filters
  setFilters: (f: Filters) => void
  onOpenTx: (t: Tx) => void
  onNewTx: () => void
}) {
  const cm = catMap(data.settings.cats)
  const f = filters
  let list = f.all ? Object.values(data.months).flat() : (data.months[month] || []).slice()
  if (f.t !== "all") list = list.filter((t) => t.t === f.t)
  if (f.cat !== "all") list = list.filter((t) => t.cat === f.cat)
  const q = norm(f.q)
  if (q)
    list = list.filter((t) =>
      norm(`${cm[t.cat]?.n || ""} ${t.n || ""} ${(t.c / 100).toFixed(2).replace(".", ",")}`).includes(q)
    )
  list.sort(byDate)
  const st = monthStats(list)
  const catOpts = data.settings.cats.filter((c) => f.t === "all" || c.t === f.t)
  const groups: { d: string; items: Tx[] }[] = []
  for (const t of list) {
    const g = groups[groups.length - 1]
    if (g && g.d === t.d) g.items.push(t)
    else groups.push({ d: t.d, items: [t] })
  }
  const filtering = !!q || f.t !== "all" || f.cat !== "all"

  return (
    <>
      <ViewTitle>Movimientos</ViewTitle>
      <div className="mb-3 grid gap-2.5 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
        <Input
          type="search"
          placeholder="Buscar por nota, categoría o importe"
          aria-label="Buscar movimientos"
          value={f.q}
          onChange={(e) => setFilters({ ...f, q: e.target.value })}
          className="h-10"
        />
        <div role="group" aria-label="Tipo de movimiento" className="inline-flex w-fit gap-1 rounded-lg bg-muted p-1">
          {(
            [
              ["all", "Todos"],
              ["g", "Gastos"],
              ["i", "Ingresos"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              aria-pressed={f.t === v}
              onClick={() => {
                let cat = f.cat
                if (cat !== "all" && v !== "all" && cm[cat]?.t !== v) cat = "all"
                setFilters({ ...f, t: v, cat })
              }}
              className={cn(
                "h-8 rounded-md px-3 text-sm font-medium text-muted-foreground",
                f.t === v && "bg-background text-foreground shadow-sm"
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <NativeSelect
          aria-label="Categoría"
          value={f.cat}
          onChange={(v) => setFilters({ ...f, cat: v })}
          options={[{ value: "all", label: "Todas las categorías" }, ...catOpts.map((c) => ({ value: c.id, label: c.n }))]}
          className="h-10 md:w-56"
        />
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={f.all} onCheckedChange={(v) => setFilters({ ...f, all: !!v })} />
          Todos los meses
        </Label>
      </div>
      <p className="mx-1 mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          <b className="font-heading tabular-nums text-foreground">{list.length}</b> {list.length === 1 ? "movimiento" : "movimientos"}
        </span>
        <span>
          Ingresos <b className="font-heading tabular-nums text-foreground">+{eur(st.inc)}</b>
        </span>
        <span>
          Gastos{" "}
          <b className="font-heading tabular-nums text-foreground">
            {MINUS}
            {eur(st.exp)}
          </b>
        </span>
        <span>
          Balance <b className="font-heading tabular-nums text-foreground">{eurS(st.bal)}</b>
        </span>
      </p>
      {!list.length ? (
        <Card>
          {filtering ? (
            <Empty title="Nada coincide con el filtro" text="Prueba con otra palabra o quita los filtros.">
              <Button variant="outline" onClick={() => setFilters({ q: "", t: "all", cat: "all", all: f.all })}>
                Quitar filtros
              </Button>
            </Empty>
          ) : (
            <Empty title="Sin movimientos este mes" text="Apunta tus ingresos y gastos para que el resumen cobre vida.">
              <Button onClick={onNewTx}>Añadir movimiento</Button>
            </Empty>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {groups.slice(0, 120).map((g) => {
            const s = monthStats(g.items)
            return (
              <section key={g.d}>
                <h3 className="mb-2 flex justify-between gap-2 px-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  <span>
                    {dayLabel(g.d)}
                    {f.all ? " " + g.d.slice(0, 4) : ""}
                  </span>
                  <span className="font-heading tabular-nums tracking-normal normal-case">{eurS(s.bal)}</span>
                </h3>
                <ul className="overflow-hidden rounded-xl border bg-card">
                  {g.items.map((t) => (
                    <TxRow key={t.id} t={t} cm={cm} onOpen={onOpenTx} />
                  ))}
                </ul>
              </section>
            )
          })}
          {groups.length > 120 ? (
            <p className="text-xs text-muted-foreground">
              Se muestran los 120 días más recientes. Usa el buscador para encontrar movimientos antiguos.
            </p>
          ) : null}
        </div>
      )}
    </>
  )
}

/* ---------- Presupuesto ---------- */
function MoneyInput({
  id,
  value,
  onCommit,
  disabled,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: {
  id: string
  value: string
  onCommit: (raw: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  "aria-label"?: string
}) {
  const [v, setV] = React.useState(value)
  const [prev, setPrev] = React.useState(value)
  if (value !== prev) {
    setPrev(value)
    setV(value)
  }
  return (
    <Input
      id={id}
      inputMode="decimal"
      autoComplete="off"
      value={v}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={cn("text-right font-heading tabular-nums", className)}
    />
  )
}

export function PresView({
  data,
  month,
  demo,
  onBudget,
}: {
  data: FinanceData
  month: string
  demo: boolean
  onBudget: (catId: string, raw: string) => void
}) {
  const txs = data.months[month] || []
  const rows = budgetRows(txs, data.settings)
  const withLim = rows.filter((r) => r.limit)
  const totLim = withLim.reduce((a, r) => a + r.limit, 0),
    totSpent = withLim.reduce((a, r) => a + r.spent, 0)
  const isCur = month === CUR(),
    daysLeft = isCur ? daysIn(month) - new Date().getDate() + 1 : 0
  const left = totLim - totSpent
  const totState = budgetState(totSpent, totLim)

  return (
    <>
      <ViewTitle>Presupuesto</ViewTitle>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="content-start self-start">
          <CardHeader>
            <CardTitle>Este mes</CardTitle>
          </CardHeader>
          <CardContent>
            {!withLim.length ? (
              <p className="text-sm text-muted-foreground">
                Ponle un límite mensual a las categorías que más se te disparan (por ejemplo, comer fuera). Te avisaré con
                colores cuando te acerques.
              </p>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
                  <Kpi k="Presupuestado" v={eur(totLim)} />
                  <Kpi k="Gastado" v={eur(totSpent)} />
                  <Kpi k={left >= 0 ? "Te queda" : "Te has pasado"} v={eur(left)} />
                  {isCur && left > 0 ? <Kpi k="Al día, hasta fin de mes" v={eur(left / daysLeft)} /> : null}
                </div>
                <Bar value={totSpent / totLim} state={totState} />
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                  <StateChip state={totState} />
                  <span>{pct(totSpent / totLim)} del total presupuestado</span>
                </div>
              </>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Los límites son mensuales y se aplican a todos los meses. Solo cuentan los gastos de las categorías con
              límite.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Por categoría</CardTitle>
            {demo ? <CardDescription>En el ejemplo no se pueden editar los límites.</CardDescription> : null}
          </CardHeader>
          <CardContent>
            <ul className="grid gap-4">
              {rows.map((r) => {
                const id = "b-" + r.cat.id
                return (
                  <li key={r.cat.id}>
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={id} className="min-w-0 font-medium">
                        {r.cat.n}
                      </Label>
                      <span className="flex items-center gap-1.5 font-heading tabular-nums text-sm font-semibold whitespace-nowrap">
                        {eur(r.spent)} <span className="font-sans font-normal text-muted-foreground">de</span>
                        <MoneyInput
                          id={id}
                          value={r.limit ? fmtPlain(r.limit) : ""}
                          placeholder="—"
                          disabled={demo}
                          aria-label={`Límite mensual para ${r.cat.n}`}
                          onCommit={(raw) => onBudget(r.cat.id, raw)}
                          className="h-8 w-20"
                        />
                        {sim()}
                      </span>
                    </div>
                    <Bar value={r.limit ? r.pct || 0 : 0} state={r.state} />
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                      <StateChip state={r.state} />
                      {r.limit ? (
                        <span>
                          {r.limit - r.spent >= 0 ? "Quedan " + eur(r.limit - r.spent) : "Te has pasado " + eur(r.spent - r.limit)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function Kpi({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
      <span className="block text-xs text-muted-foreground">{k}</span>
      <b className="font-heading tabular-nums text-lg font-semibold">{v}</b>
    </div>
  )
}

/* ---------- Metas ---------- */
export function MetasView({
  goals,
  onNew,
  onEdit,
  onAport,
}: {
  goals: Goal[]
  onNew: () => void
  onEdit: (g: Goal) => void
  onAport: (g: Goal, sign: 1 | -1) => void
}) {
  const cur = CUR()
  const totA = goals.reduce((a, g) => a + g.ah, 0),
    totO = goals.reduce((a, g) => a + g.obj, 0)
  return (
    <>
      <div className="mt-2 mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold tracking-tight">Metas de ahorro</h2>
        <Button onClick={onNew}>Nueva meta</Button>
      </div>
      {!goals.length ? (
        <Card>
          <Empty
            title="Todavía no tienes metas"
            text="Un fondo para imprevistos, un portátil, un viaje… Ponle cifra y fecha y te digo cuánto apartar cada mes."
          >
            <Button onClick={onNew}>Crear mi primera meta</Button>
          </Empty>
        </Card>
      ) : (
        <>
          <p className="mx-1 mb-4 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
            <span>
              Ahorrado en metas <b className="font-heading tabular-nums text-foreground">{eur(totA)}</b>
            </span>
            <span>
              de <b className="font-heading tabular-nums text-foreground">{eur(totO)}</b>
            </span>
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((g) => {
              const p = g.obj ? g.ah / g.obj : 0,
                falta = Math.max(0, g.obj - g.ah),
                done = falta === 0
              const ml = g.fecha ? monthsBetween(cur, g.fecha) : 0
              return (
                <Card key={g.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{g.n}</CardTitle>
                    <CardAction className="font-heading tabular-nums text-sm font-semibold">{pct(p)}</CardAction>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    <p className="font-heading tabular-nums font-semibold">
                      {eur(g.ah)} <span className="font-normal text-muted-foreground">de {eur(g.obj)}</span>
                    </p>
                    <Progress value={Math.min(100, p * 100)} aria-label={`${pct(p)} conseguido`} className="[&_[data-slot=progress-track]]:h-2.5" />
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                      {done ? <StateChip state="ok" label="Meta conseguida" /> : <span>Te faltan {eur(falta)}</span>}
                      {!done && g.fecha ? (
                        ml > 0 ? (
                          <span>
                            Aparta <b className="font-heading tabular-nums text-foreground">{eur(Math.ceil(falta / ml))}</b> al mes durante {ml}{" "}
                            {ml === 1 ? "mes" : "meses"} (hasta {monthLabel(g.fecha)})
                          </span>
                        ) : (
                          <StateChip state="warn" label="La fecha ya ha llegado" />
                        )
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => onAport(g, 1)}>
                        Aportar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onAport(g, -1)}>
                        Retirar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onEdit(g)}>
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Las aportaciones a metas no cuentan como gasto: es dinero que apartas de tu saldo.
          </p>
        </>
      )}
    </>
  )
}

/* ---------- Ajustes ---------- */
export function AjustesView({
  data,
  memory,
  onMoneda,
  onSaldo,
  onNewRec,
  onEditRec,
  onToggleRec,
  onNewCat,
  onRenameCat,
  onGroupCat,
  onDeleteCat,
  onExportCSV,
  onExportJSON,
  onCopyCSV,
  onImport,
  onWipe,
}: {
  data: FinanceData
  memory: boolean
  onMoneda: (m: Moneda) => void
  onSaldo: (raw: string) => void
  onNewRec: () => void
  onEditRec: (r: Recurring) => void
  onToggleRec: (id: string, on: boolean) => void
  onNewCat: () => void
  onRenameCat: (id: string, name: string) => void
  onGroupCat: (id: string, g: "nec" | "des") => void
  onDeleteCat: (c: Category) => void
  onExportCSV: () => void
  onExportJSON: () => void
  onCopyCSV: () => void
  onImport: (f: File) => void
  onWipe: () => void
}) {
  const s = data.settings,
    cm = catMap(s.cats)
  const catRow = (c: Category) => (
    <li key={c.id} className="flex flex-wrap items-center gap-2 border-t py-2.5 first:border-t-0">
      <CatName c={c} onRename={onRenameCat} />
      {c.t === "g" ? (
        <NativeSelect
          aria-label="Tipo de gasto"
          value={c.g === "nec" ? "nec" : "des"}
          onChange={(v) => onGroupCat(c.id, v as "nec" | "des")}
          options={[
            { value: "nec", label: "Necesidad" },
            { value: "des", label: "Deseo" },
          ]}
          className="w-auto"
        />
      ) : null}
      {c.id === "otros-g" || c.id === "otros-i" ? (
        <span className="w-[74px] text-center text-xs text-muted-foreground" title="Esta categoría no se puede borrar">
          Fija
        </span>
      ) : (
        <Button size="sm" variant="destructive" onClick={() => onDeleteCat(c)} aria-label={`Eliminar ${c.n}`}>
          Eliminar
        </Button>
      )}
    </li>
  )
  return (
    <>
      <ViewTitle>Ajustes</ViewTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid min-w-0 content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Moneda</CardTitle>
              <CardDescription>En la que apuntas y ves todos tus importes. Cambiarla no convierte lo que ya tienes apuntado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div role="radiogroup" aria-label="Moneda" className="grid grid-cols-2 gap-2">
                {(Object.keys(MONEDAS) as Moneda[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={s.moneda === m}
                    onClick={() => onMoneda(m)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 ring-foreground/10 transition-colors",
                      s.moneda === m ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/60"
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 font-heading text-lg font-semibold text-primary">
                      {MONEDAS[m].sim}
                    </span>
                    <span className="grid leading-tight">
                      <span className="font-medium">{MONEDAS[m].nombre}</span>
                      <span className="text-xs text-muted-foreground">{m === "EUR" ? "España y zona euro" : "Argentina"}</span>
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Saldo inicial</CardTitle>
              <CardDescription>
                Lo que tenías en tu cuenta el día que empezaste a apuntar. Se suma al saldo acumulado del ticket.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex max-w-60 items-center gap-2">
              <MoneyInput
                id="saldo-ini"
                aria-label="Saldo inicial"
                value={fmtPlain(s.saldoInicial || 0)}
                onCommit={onSaldo}
                className="h-10"
              />
              <span>{sim()}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Fijos mensuales</CardTitle>
              <CardAction>
                <Button size="sm" variant="outline" onClick={onNewRec}>
                  Añadir fijo
                </Button>
              </CardAction>
              <CardDescription>
                Lo que se repite cada mes: nómina, aportación en casa, móvil, cuota del ciclo… En el resumen te recuerdo
                los que faltan por apuntar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {s.recs.length ? (
                <ul>
                  {s.recs.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 border-t py-2.5 first:border-t-0">
                      <Label className="flex min-w-0 flex-[1_1_140px] items-center gap-2.5 font-normal">
                        <Checkbox checked={r.on !== false} onCheckedChange={(v) => onToggleRec(r.id, !!v)} aria-label="Activo" />
                        <span>
                          <b className="font-medium">{r.n}</b>
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {cm[r.cat]?.n || ""} · día {r.dia}
                          </span>
                        </span>
                      </Label>
                      <span className="font-heading tabular-nums text-sm font-semibold">
                        {r.t === "i" ? "+" : MINUS}
                        {eur(r.c)}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => onEditRec(r)}>
                        Editar
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Todavía no tienes fijos. También puedes crearlos marcando «Repetir cada mes» al añadir un movimiento.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Copia de seguridad</CardTitle>
              <CardDescription>
                El CSV se abre directamente en Excel (separado por punto y coma). La copia completa guarda también metas,
                fijos y presupuestos.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={onExportCSV}>
                Descargar movimientos (CSV)
              </Button>
              <Button size="sm" variant="outline" onClick={onExportJSON}>
                Descargar copia completa
              </Button>
              <Label className="relative inline-flex h-7 cursor-pointer items-center overflow-hidden rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted">
                Importar archivo
                <input
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  aria-label="Importar archivo CSV o copia completa"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onImport(file)
                    e.target.value = ""
                  }}
                />
              </Label>
              <Button size="sm" variant="link" onClick={onCopyCSV}>
                Copiar CSV
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Borrar datos</CardTitle>
              <CardDescription>Elimina todos tus movimientos, metas, fijos y ajustes. No se puede deshacer.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="destructive" onClick={onWipe}>
                Borrar todos mis datos
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Categorías</CardTitle>
              <CardAction>
                <Button size="sm" variant="outline" onClick={onNewCat}>
                  Nueva categoría
                </Button>
              </CardAction>
              <CardDescription>
                Cambia el nombre escribiendo encima. «Necesidad» o «Deseo» decide cómo cuenta en la regla 50/30/20.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="mt-1 mb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">Gastos</h3>
              <ul>{s.cats.filter((c) => c.t === "g").map(catRow)}</ul>
              <h3 className="mt-4 mb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">Ingresos</h3>
              <ul>{s.cats.filter((c) => c.t === "i").map(catRow)}</ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Privacidad</CardTitle>
              <CardDescription>
                {memory
                  ? "Ahora mismo no se está guardando nada: si cierras la página, se pierde. Descarga una copia antes de salir."
                  : "Tus datos se guardan solo en este navegador y no salen de tu dispositivo. Para pasarlos a otro dispositivo, descarga una copia completa e impórtala allí."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </>
  )
}

function CatName({ c, onRename }: { c: Category; onRename: (id: string, n: string) => void }) {
  const [v, setV] = React.useState(c.n)
  const [prev, setPrev] = React.useState(c.n)
  if (c.n !== prev) {
    setPrev(c.n)
    setV(c.n)
  }
  return (
    <Input
      aria-label="Nombre de la categoría"
      maxLength={40}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = v.trim()
        if (!n) setV(c.n)
        else if (n !== c.n) onRename(c.id, n)
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="h-8 min-w-0 flex-[1_1_140px]"
    />
  )
}

