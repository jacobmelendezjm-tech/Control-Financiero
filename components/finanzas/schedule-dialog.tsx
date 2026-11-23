"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormError, Shell } from "@/components/finanzas/dialogs"
import { todayStr, type DayPlan, type Schedule, type WorkCfg } from "@/lib/finance"
import { DAY_NAMES, addDays, cycleWeekMinutes, fmtH, planMinutes, toMin, weekIndex, weekStart } from "@/lib/work"
import { cn } from "@/lib/utils"

const emptyWeek = (): (DayPlan | null)[] => Array(7).fill(null)
const cloneWeek = (w: (DayPlan | null)[]) => w.map((d) => (d ? { ...d } : null))

function Pills<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { v: T; l: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Button
          key={o.v}
          type="button"
          size="sm"
          variant={value === o.v ? "default" : "outline"}
          aria-pressed={value === o.v}
          className="rounded-full"
          onClick={() => onChange(o.v)}
        >
          {o.l}
        </Button>
      ))}
    </div>
  )
}

/** Horario por turnos: un ciclo de 1 a 4 semanas con el turno de cada día. */
export function ScheduleDialog({
  open,
  cfg,
  onClose,
  onSave,
}: {
  open: boolean
  cfg: WorkCfg
  onClose: () => void
  onSave: (s: Schedule | undefined) => void
}) {
  const today = todayStr()
  const cur = cfg.schedule
  const [weeks, setWeeks] = React.useState<(DayPlan | null)[][]>(() => (cur?.weeks.length ? cur.weeks.map(cloneWeek) : [emptyWeek()]))
  const [tab, setTab] = React.useState(0)
  // Qué semana del ciclo es la actual.
  const [nowIdx, setNowIdx] = React.useState(() => (cur?.weeks.length ? weekIndex(today, cur) : 0))
  const [err, setErr] = React.useState("")
  const firstPlan: DayPlan = cfg.turnos?.[0] ? toPlan(cfg.turnos[0]) : { ini: cfg.ini, fin: cfg.fin, pausa: 0 }

  const setCount = (n: number) => {
    setWeeks((ws) => {
      const out = ws.slice(0, n)
      while (out.length < n) out.push(cloneWeek(ws[0] || emptyWeek()))
      return out
    })
    setTab((t) => Math.min(t, n - 1))
    setNowIdx((k) => Math.min(k, n - 1))
  }
  const setDay = (w: number, d: number, v: DayPlan | null) =>
    setWeeks((ws) => ws.map((wk, i) => (i === w ? wk.map((x, j) => (j === d ? v : x)) : wk)))
  const copyFirst = () => setWeeks((ws) => ws.map((wk, i) => (i === tab ? cloneWeek(ws[0]) : wk)))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    for (const [i, wk] of weeks.entries())
      for (const [j, d] of wk.entries()) {
        if (!d) continue
        const day = DAY_NAMES[j].toLowerCase()
        if (toMin(d.ini) == null || toMin(d.fin) == null) return setErr(`Revisa las horas del ${day} (semana ${i + 1}).`)
        if (planMinutes(d) <= 0) return setErr(`El ${day} de la semana ${i + 1} no suma horas.`)
      }
    if (!weeks.some((w) => w.some(Boolean))) return setErr("Marca al menos un día de trabajo.")
    // La semana 1 del ciclo empieza `nowIdx` semanas antes que la actual.
    onSave({ on: true, anchor: addDays(weekStart(today), -7 * nowIdx), weeks })
  }

  const week = weeks[tab]
  const ws = weekStart(today)
  const we = addDays(ws, 6)
  return (
    <Shell
      open={open}
      onClose={onClose}
      title="Mi horario"
      description="Para turnos que cambian de una semana a otra. Fichar, el calendario y las horas extra seguirán este horario."
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <div className="grid gap-1.5">
          <span className="text-sm text-muted-foreground">¿Cada cuántas semanas se repite?</span>
          <Pills
            label="Semanas del ciclo"
            value={String(weeks.length)}
            onChange={(v) => setCount(Number(v))}
            options={[
              { v: "1", l: "Igual cada semana" },
              { v: "2", l: "2 semanas" },
              { v: "3", l: "3" },
              { v: "4", l: "4" },
            ]}
          />
        </div>

        {weeks.length > 1 ? (
          <div role="tablist" aria-label="Semana del ciclo" className="flex gap-1 rounded-xl bg-muted p-1">
            {weeks.map((w, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={tab === i}
                onClick={() => setTab(i)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground",
                  tab === i && "bg-background text-foreground shadow-sm"
                )}
              >
                Semana {i + 1}
                <span className="block text-[11px] font-normal">{fmtH(cycleWeekMinutes(w))}</span>
              </button>
            ))}
          </div>
        ) : null}

        <ul className="grid gap-1.5">
          {week.map((d, j) => (
            <li key={j} className={cn("grid grid-cols-[68px_1fr] items-center gap-1.5 rounded-xl px-2 py-1.5", d && "bg-primary/8")}>
              <Label className="flex items-center gap-2 font-medium">
                <Checkbox
                  checked={!!d}
                  onCheckedChange={(v) => setDay(tab, j, v ? d || firstPlan : null)}
                />
                {DAY_NAMES[j].slice(0, 3)}
              </Label>
              {d ? (
                <div className="grid grid-cols-[1fr_1fr_52px] items-center gap-1.5 [&_input[type=time]::-webkit-calendar-picker-indicator]:hidden">
                  <Input
                    aria-label={`Entrada del ${DAY_NAMES[j]}`}
                    type="time"
                    value={d.ini}
                    onChange={(e) => setDay(tab, j, { ...d, ini: e.target.value })}
                    className="h-9 px-2 text-sm"
                  />
                  <Input
                    aria-label={`Salida del ${DAY_NAMES[j]}`}
                    type="time"
                    value={d.fin}
                    onChange={(e) => setDay(tab, j, { ...d, fin: e.target.value })}
                    className="h-9 px-2 text-sm"
                  />
                  <Input
                    aria-label={`Minutos de pausa del ${DAY_NAMES[j]}`}
                    inputMode="numeric"
                    placeholder="min"
                    value={d.pausa ? String(d.pausa) : ""}
                    onChange={(e) => setDay(tab, j, { ...d, pausa: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                    className="h-9 px-2 text-sm"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Libre</span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {weeks.length > 1 ? `Semana ${tab + 1}: ` : "Total: "}
            <b className="text-foreground">{fmtH(cycleWeekMinutes(week))}</b> · pausa en minutos
          </span>
          {tab > 0 ? (
            <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={copyFirst}>
              Copiar la semana 1
            </Button>
          ) : null}
        </div>

        {weeks.length > 1 ? (
          <div className="grid gap-2 rounded-xl bg-muted/70 p-3">
            <span className="text-sm font-medium">
              Esta semana ({+ws.slice(8)}/{+ws.slice(5, 7)} – {+we.slice(8)}/{+we.slice(5, 7)}) es la…
            </span>
            <Pills
              label="Semana actual del ciclo"
              value={String(nowIdx)}
              onChange={(v) => setNowIdx(Number(v))}
              options={weeks.map((_, i) => ({ v: String(i), l: `Semana ${i + 1}` }))}
            />
          </div>
        ) : null}

        <FormError msg={err} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {cur ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={() => onSave(undefined)}>
              Quitar horario
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar horario</Button>
          </div>
        </div>
      </form>
    </Shell>
  )
}

/* ---------- Planificar una semana concreta (a toques) ---------- */
const fmtDay = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number)
  return new Date(y, m - 1, dd).toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "")
}
/** «08:00»→«8», «09:30»→«9:30» */
const short = (t: string) => {
  const [h, m] = t.split(":")
  return m === "00" ? String(+h) : `${+h}:${m}`
}
export const shiftLabel = (p: DayPlan) => `${short(p.ini)}–${short(p.fin)}`

export type Preset = DayPlan & { n?: string }
/** Un atajo sin el nombre: lo que se guarda en el horario. */
export const toPlan = (p: Preset): DayPlan => ({ ini: p.ini, fin: p.fin, pausa: p.pausa || 0 })
/** «Mañana · 6–14» o solo las horas. */
export const presetLabel = (p: Preset) => (p.n ? `${p.n} · ${shiftLabel(p)}` : shiftLabel(p))

/** Turnos habituales: primero tus turnos tipo, luego lo que más fichas y tu horario. */
export function usualShifts(cfg: WorkCfg, shifts: { kind: string; ini: string; fin: string; pausa: number }[]): Preset[] {
  const tipos: Preset[] = (cfg.turnos || []).map((t) => ({ n: t.n, ini: t.ini, fin: t.fin, pausa: t.pausa }))
  const taken = new Set(tipos.map((t) => `${t.ini}-${t.fin}`))
  const count = new Map<string, { p: DayPlan; n: number }>()
  const push = (p: DayPlan | null | undefined, n = 1) => {
    if (!p || !p.ini || !p.fin) return
    const k = `${p.ini}-${p.fin}`
    if (taken.has(k)) return
    const cur = count.get(k)
    count.set(k, { p: { ini: p.ini, fin: p.fin, pausa: p.pausa || 0 }, n: (cur?.n || 0) + n })
  }
  for (const s of shifts.slice(-60)) if (s.kind === "trabajo") push(s)
  for (const w of cfg.schedule?.weeks || []) for (const p of w) push(p, 2)
  for (const w of Object.values(cfg.weekPlans || {})) for (const p of w) push(p, 2)
  if (!count.size && !tipos.length) push({ ini: cfg.ini, fin: cfg.fin, pausa: cfg.pausa })
  const rest = [...count.values()].sort((a, b) => b.n - a.n).map((x) => x.p)
  return [...tipos, ...rest].slice(0, Math.max(4, tipos.length))
}

/**
 * Horario de una semana concreta: un toque por día. Pensado para quien tiene turnos
 * distintos cada semana. Tiene prioridad sobre el horario rotativo y la jornada normal.
 */
export function WeekPlanDialog({
  open,
  cfg,
  shifts,
  initialWeek,
  onClose,
  onSave,
}: {
  open: boolean
  cfg: WorkCfg
  shifts: { kind: string; ini: string; fin: string; pausa: number }[]
  initialWeek?: string
  onClose: () => void
  onSave: (monday: string, week: (DayPlan | null)[] | null) => void
}) {
  const thisWeek = weekStart(todayStr())
  const presets = React.useMemo(() => usualShifts(cfg, shifts), [cfg, shifts])
  const [ws, setWs] = React.useState(initialWeek || thisWeek)
  const planOf = React.useCallback(
    (monday: string): (DayPlan | null)[] =>
      cfg.weekPlans?.[monday]
        ? cloneWeek(cfg.weekPlans[monday])
        : Array.from({ length: 7 }, (_, i) => {
            const p = planForCycle(addDays(monday, i), cfg)
            return p ? { ...p } : null
          }),
    [cfg]
  )
  const [week, setWeek] = React.useState<(DayPlan | null)[]>(() => planOf(initialWeek || thisWeek))
  const [custom, setCustom] = React.useState<number | null>(null)
  const [err, setErr] = React.useState("")
  const saved = !!cfg.weekPlans?.[ws]
  const prevWeek = planOf(addDays(ws, -7))

  const move = (k: number) => {
    const next = addDays(ws, 7 * k)
    setWs(next)
    setWeek(planOf(next))
    setCustom(null)
    setErr("")
  }
  const setDay = (j: number, v: DayPlan | null) => setWeek((w) => w.map((x, i) => (i === j ? v : x)))
  const same = (a: DayPlan | null, b: DayPlan | null) => (!a && !b) || (!!a && !!b && a.ini === b.ini && a.fin === b.fin)

  function save() {
    for (const [j, d] of week.entries()) {
      if (!d) continue
      if (toMin(d.ini) == null || toMin(d.fin) == null || planMinutes(d) <= 0) return setErr(`Revisa las horas del ${DAY_NAMES[j].toLowerCase()}.`)
    }
    onSave(ws, week)
  }

  const label = ws === thisWeek ? "Esta semana" : ws === addDays(thisWeek, 7) ? "Semana que viene" : `${fmtDay(ws)} – ${fmtDay(addDays(ws, 6))}`
  return (
    <Shell open={open} onClose={onClose} title="Tu horario">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-muted p-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => move(-1)}>
            ‹
          </Button>
          <div className="grid text-center leading-tight">
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-[11px] text-muted-foreground">{fmtH(cycleWeekMinutes(week))}</span>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Semana siguiente" onClick={() => move(1)}>
            ›
          </Button>
        </div>

        {prevWeek.some(Boolean) ? (
          <Button type="button" variant="outline" size="sm" className="justify-self-start rounded-full" onClick={() => setWeek(prevWeek.map((p) => (p ? { ...p } : null)))}>
            Igual que la semana anterior
          </Button>
        ) : null}

        <ul className="grid gap-1">
          {week.map((d, j) => (
            <li key={j} className="grid gap-1.5 rounded-xl py-1">
              <div className="flex items-center gap-2">
                <span className="w-11 shrink-0 leading-tight">
                  <span className="block text-sm font-semibold">{DAY_NAMES[j].slice(0, 3)}</span>
                  <span className="block text-[10px] text-muted-foreground">{+addDays(ws, j).slice(8)}</span>
                </span>
                <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setDay(j, null)
                      setCustom(null)
                    }}
                    className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm ring-1 ring-foreground/10", !d && "bg-muted font-semibold ring-foreground/30")}
                  >
                    Libre
                  </button>
                  {presets.map((p) => (
                    <button
                      key={p.ini + p.fin}
                      type="button"
                      onClick={() => {
                        setDay(j, toPlan(p))
                        setCustom(null)
                      }}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium tabular-nums ring-1 ring-foreground/10",
                        same(d, p) && "bg-primary text-primary-foreground ring-primary"
                      )}
                    >
                      {presetLabel(p)}
                    </button>
                  ))}
                  {d && !presets.some((p) => same(d, p)) ? (
                    <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground tabular-nums">{shiftLabel(d)}</span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Otro horario el ${DAY_NAMES[j]}`}
                    onClick={() => {
                      if (!d) setDay(j, { ...(presets[0] || { ini: cfg.ini, fin: cfg.fin, pausa: 0 }) })
                      setCustom(custom === j ? null : j)
                    }}
                    className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm text-muted-foreground ring-1 ring-dashed ring-foreground/20", custom === j && "ring-primary text-primary")}
                  >
                    Otro…
                  </button>
                </div>
              </div>
              {custom === j && d ? (
                <div className="ml-13 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 [&_input[type=time]::-webkit-calendar-picker-indicator]:hidden">
                  <Input aria-label={`Entrada del ${DAY_NAMES[j]}`} type="time" value={d.ini} onChange={(e) => setDay(j, { ...d, ini: e.target.value })} className="h-10 text-center" />
                  <span className="text-muted-foreground">a</span>
                  <Input aria-label={`Salida del ${DAY_NAMES[j]}`} type="time" value={d.fin} onChange={(e) => setDay(j, { ...d, fin: e.target.value })} className="h-10 text-center" />
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        <FormError msg={err} />
        <div className="flex items-center justify-between gap-2">
          {saved ? (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onSave(ws, null)}>
              Borrar semana
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" className="h-11 rounded-full px-6" onClick={save}>
            Guardar
          </Button>
        </div>
      </div>
    </Shell>
  )
}

/** Turno del horario rotativo, ignorando semanas planificadas (para proponer valores). */
function planForCycle(date: string, cfg: WorkCfg) {
  const sch = cfg.schedule
  if (!sch?.on || !sch.weeks.length) return null
  const [y, m, d] = date.split("-").map(Number)
  const wd = (new Date(y, m - 1, d).getDay() + 6) % 7
  return sch.weeks[weekIndex(date, sch)][wd] || null
}
