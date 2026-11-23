"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Shell } from "@/components/finanzas/dialogs"
import { presetLabel, toPlan, usualShifts } from "@/components/finanzas/schedule-dialog"
import { todayStr, type DayPlan, type Shift, type WorkCfg } from "@/lib/finance"
import { planFor, planMinutes, toMin } from "@/lib/work"
import { cn } from "@/lib/utils"

export type DayEstado = "libre" | "trabajo" | "cubre"
export interface DayResult {
  date: string
  estado: DayEstado
  plan: DayPlan | null
  note: string
}

const ESTADOS: { v: DayEstado; l: string; on: string; dot: string }[] = [
  { v: "libre", l: "Libre", on: "bg-good text-white ring-good", dot: "bg-good" },
  { v: "trabajo", l: "Trabajo", on: "bg-bad text-white ring-bad", dot: "bg-bad" },
  { v: "cubre", l: "Cubro a alguien", on: "bg-gold text-[#1f2b2d] ring-gold", dot: "bg-gold" },
]

/** Un día del calendario: libre / trabajo / cubro, horario a un toque y nota. */
export function DayDialog({
  open,
  date,
  cfg,
  allShifts,
  note,
  onClose,
  onSave,
  onMore,
  fichar,
}: {
  open: boolean
  date: string
  /** Abierto desde «Fichar hoy»: empieza en «Trabajo». */
  fichar?: boolean
  cfg: WorkCfg
  allShifts: Shift[]
  note: string
  onClose: () => void
  onSave: (r: DayResult) => void
  onMore: () => void
}) {
  const past = date <= todayStr()
  const mine = allShifts.filter((s) => s.d === date)
  const work = mine.find((s) => s.kind === "trabajo")
  const plan = planFor(date, cfg)
  const presets = React.useMemo(() => usualShifts(cfg, allShifts), [cfg, allShifts])

  const initial: { estado: DayEstado; p: DayPlan } = work
    ? { estado: work.cubre ? "cubre" : "trabajo", p: { ini: work.ini, fin: work.fin, pausa: work.pausa } }
    : mine.length
      ? { estado: "libre", p: presets[0] ? toPlan(presets[0]) : { ini: cfg.ini, fin: cfg.fin, pausa: cfg.pausa } }
      : plan
        ? { estado: plan.cubre ? "cubre" : "trabajo", p: { ini: plan.ini, fin: plan.fin, pausa: plan.pausa } }
        : { estado: fichar ? "trabajo" : "libre", p: presets[0] ? toPlan(presets[0]) : { ini: cfg.ini, fin: cfg.fin, pausa: cfg.pausa } }

  const [estado, setEstado] = React.useState<DayEstado>(initial.estado)
  const [p, setP] = React.useState<DayPlan>(initial.p)
  const [custom, setCustom] = React.useState(!presets.some((x) => x.ini === initial.p.ini && x.fin === initial.p.fin))
  const [text, setText] = React.useState(note)
  const [err, setErr] = React.useState("")

  const [y, m, d] = date.split("-").map(Number)
  const title = new Date(y, m - 1, d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })

  const save = () => {
    if (estado !== "libre" && (toMin(p.ini) == null || toMin(p.fin) == null || planMinutes(p) <= 0))
      return setErr("Revisa la hora de entrada y de salida.")
    onSave({ date, estado, plan: estado === "libre" ? null : { ...p, cubre: estado === "cubre" }, note: text.trim().slice(0, 200) })
  }

  return (
    <Shell open={open} onClose={onClose} title={title.charAt(0).toUpperCase() + title.slice(1)}>
      <div className="grid gap-4">
        <div role="radiogroup" aria-label="Tipo de día" className="grid grid-cols-3 gap-1.5">
          {ESTADOS.map((e) => (
            <button
              key={e.v}
              type="button"
              role="radio"
              aria-checked={estado === e.v}
              onClick={() => setEstado(e.v)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1.5 rounded-2xl px-2 text-sm font-semibold ring-1 ring-foreground/10 transition-colors",
                estado === e.v ? e.on : "hover:bg-muted/60"
              )}
            >
              {estado !== e.v ? <i aria-hidden className={cn("size-2.5 shrink-0 rounded-full", e.dot)} /> : null}
              <span className="leading-tight">{e.l}</span>
            </button>
          ))}
        </div>

        {estado !== "libre" ? (
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-1.5">
              {presets.map((x) => {
                const sel = !custom && x.ini === p.ini && x.fin === p.fin
                return (
                  <button
                    key={x.ini + x.fin}
                    type="button"
                    onClick={() => {
                      setP(toPlan(x))
                      setCustom(false)
                    }}
                    className={cn(
                      "rounded-full px-3.5 py-2 text-sm font-medium tabular-nums ring-1 ring-foreground/10",
                      sel && "bg-primary text-primary-foreground ring-primary"
                    )}
                  >
                    {presetLabel(x)}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setCustom(true)}
                className={cn("rounded-full px-3.5 py-2 text-sm text-muted-foreground ring-1 ring-foreground/15", custom && "text-primary ring-primary")}
              >
                Otro…
              </button>
            </div>
            {custom ? (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 [&_input[type=time]::-webkit-calendar-picker-indicator]:hidden">
                <Input aria-label="Entrada" type="time" value={p.ini} onChange={(e) => setP({ ...p, ini: e.target.value })} className="h-11 text-center text-base" />
                <span className="text-muted-foreground">a</span>
                <Input aria-label="Salida" type="time" value={p.fin} onChange={(e) => setP({ ...p, fin: e.target.value })} className="h-11 text-center text-base" />
              </div>
            ) : null}
          </div>
        ) : null}

        <Textarea
          aria-label="Nota del día"
          placeholder={estado === "cubre" ? "¿A quién cubres? (opcional)" : "Nota (opcional)"}
          maxLength={200}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-0 resize-none"
        />

        {err ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {err}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          {past ? (
            <button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={onMore}>
              Vacaciones, baja, pausa…
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">Previsto</span>
          )}
          <Button type="button" className="h-11 rounded-full px-7" onClick={save}>
            Guardar
          </Button>
        </div>
      </div>
    </Shell>
  )
}
