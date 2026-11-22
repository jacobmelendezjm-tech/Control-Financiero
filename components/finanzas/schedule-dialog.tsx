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
                  onCheckedChange={(v) => setDay(tab, j, v ? d || { ini: cfg.ini, fin: cfg.fin, pausa: 0 } : null)}
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
