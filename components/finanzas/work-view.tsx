"use client"

import * as React from "react"
import { CalendarRangeIcon, ClockIcon, FileTextIcon, PlusIcon, Settings2Icon, WandSparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Chip, OrbitDeco, Eyebrow, Meter, MiniBars, SectionTitle, Stat, WEEKDAYS } from "@/components/finanzas/kit"
import { eur, eur0, monthLabel, monthShort, pct, todayStr, type FinanceData, type Payslip, type Shift } from "@/lib/finance"
import {
  DAY_NAMES,
  KIND_LABEL,
  calendarGrid,
  cycleWeekMinutes,
  hasAnySchedule,
  planFor,
  weekStart,
  planMinutes,
  scheduleOn,
  weekIndex,
  dayTotals,
  fmtH,
  fmtMin,
  monthDays,
  monthWeeks,
  payslipYear,
  summarize,
} from "@/lib/work"
import { cn } from "@/lib/utils"
import { shiftLabel } from "@/components/finanzas/schedule-dialog"
import { addDays, modoOf, reglaOf, type DayTotal } from "@/lib/work"
import type { WorkCfg } from "@/lib/finance"

type ToneKind = "libre" | "trabajo" | "cubre" | "baja" | "none"
const TONE_CLASS: Record<ToneKind, { solid: string; soft: string }> = {
  libre: { solid: "bg-good text-white", soft: "bg-good/15 text-foreground ring-1 ring-good/35" },
  trabajo: { solid: "bg-bad text-white", soft: "bg-bad/12 text-foreground ring-1 ring-bad/35" },
  cubre: { solid: "bg-gold text-[#1f2b2d]", soft: "bg-gold/25 text-foreground ring-1 ring-gold/60" },
  baja: { solid: "bg-muted-foreground/35 text-foreground", soft: "bg-muted text-muted-foreground" },
  none: { solid: "bg-muted/60 text-muted-foreground", soft: "bg-muted/60 text-muted-foreground" },
}
/** Color de un día: lo fichado (intenso) o lo previsto por el horario (suave). */
function dayTone(d: string, t: DayTotal | undefined, cfg: WorkCfg): { kind: ToneKind; solid: boolean } {
  if (t) {
    if (t.min > 0) return { kind: t.cubre ? "cubre" : "trabajo", solid: true }
    return { kind: t.kinds.includes("baja") ? "baja" : "libre", solid: true }
  }
  const p = planFor(d, cfg)
  if (p) return { kind: p.cubre ? "cubre" : "trabajo", solid: false }
  if (p === null) return { kind: "libre", solid: false }
  return { kind: "none", solid: false }
}

/** Tu semana de un vistazo: toca para poner el horario. */
function WeekStrip({
  cfg,
  map,
  today,
  onEdit,
  onRotate,
  onDay,
}: {
  cfg: WorkCfg
  map: Record<string, DayTotal>
  today: string
  onEdit: (monday?: string) => void
  onRotate: () => void
  onDay: (d: string) => void
}) {
  const [off, setOff] = React.useState(0)
  const monday = addDays(weekStart(today), 7 * off)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  return (
    <Card className="gap-2 py-3">
      <div className="flex items-center justify-between px-3">
        <Button variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => setOff(off - 1)}>
          ‹
        </Button>
        <span className="text-sm font-semibold">{off === 0 ? "Esta semana" : off === 1 ? "Semana que viene" : off === -1 ? "Semana pasada" : `Semana del ${+monday.slice(8)}/${+monday.slice(5, 7)}`}</span>
        <Button variant="ghost" size="icon" aria-label="Semana siguiente" onClick={() => setOff(off + 1)}>
          ›
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 px-2">
        {days.map((d, i) => {
          const t = map[d]
          const p = planFor(d, cfg)
          const done = !!t?.min
          const tone = dayTone(d, t, cfg)
          return (
            <button
              key={d}
              type="button"
              onClick={() => onDay(d)}
              aria-label={`${WEEKDAYS[i]} ${+d.slice(8)}: ${done ? "fichado" : p ? shiftLabel(p) : "libre"}`}
              className={cn(
                "grid min-h-16 content-start justify-items-center gap-0.5 rounded-xl px-0.5 py-1.5 transition-colors active:scale-95",
                TONE_CLASS[tone.kind][tone.solid ? "solid" : "soft"],
                d === today && "outline-2 outline-offset-1 outline-foreground"
              )}
            >
              <span className="text-[11px] font-semibold">{WEEKDAYS[i]}</span>
              <span className="text-sm font-semibold leading-none">{+d.slice(8)}</span>
              <span className="text-[9.5px] leading-tight tabular-nums">{done ? "✓" : p ? shiftLabel(p).replace("–", "-") : "—"}</span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between px-4 text-xs">
        <button type="button" className="font-medium text-primary" onClick={() => onEdit(monday)}>
          Poner la semana entera
        </button>
        <button type="button" className="text-muted-foreground underline-offset-2 hover:underline" onClick={onRotate}>
          ¿Se repite? Horario rotativo
        </button>
      </div>
    </Card>
  )
}

export type WorkTab = "jornadas" | "nominas"

export function WorkView({
  data,
  month,
  tab,
  onTab,
  onDay,
  onClock,
  onCfg,
  onSchedule,
  onWeekPlan,
  onFill,
  onNewPayslip,
  onEditPayslip,
}: {
  data: FinanceData
  month: string
  tab: WorkTab
  onTab: (t: WorkTab) => void
  onDay: (d: string, s: Shift | null) => void
  onClock: () => void
  onCfg: () => void
  onSchedule: () => void
  onWeekPlan: (monday?: string) => void
  onFill: () => void
  onNewPayslip: () => void
  onEditPayslip: (p: Payslip) => void
}) {
  return (
    <div className="view-in grid gap-4">
      <div role="tablist" aria-label="Trabajo" className="grid grid-cols-2 gap-1 rounded-2xl bg-card p-1 ring-1 ring-foreground/8">
        {(
          [
            ["jornadas", "Jornadas", ClockIcon],
            ["nominas", "Nóminas", FileTextIcon],
          ] as const
        ).map(([v, l, Icon]) => (
          <button
            key={v}
            role="tab"
            type="button"
            aria-selected={tab === v}
            onClick={() => onTab(v)}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-muted-foreground transition-colors",
              tab === v && "bg-hero text-hero-foreground shadow-sm"
            )}
          >
            <Icon className="size-4" />
            {l}
          </button>
        ))}
      </div>
      {tab === "jornadas" ? (
        <Jornadas data={data} month={month} onDay={onDay} onClock={onClock} onCfg={onCfg} onSchedule={onSchedule} onWeekPlan={onWeekPlan} onFill={onFill} />
      ) : (
        <Nominas data={data} month={month} onNew={onNewPayslip} onEdit={onEditPayslip} />
      )}
    </div>
  )
}

function Jornadas({
  data,
  month,
  onDay,
  onClock,
  onCfg,
  onSchedule,
  onWeekPlan,
  onFill,
}: {
  data: FinanceData
  month: string
  onDay: (d: string, s: Shift | null) => void
  onClock: () => void
  onCfg: () => void
  onSchedule: () => void
  onWeekPlan: (monday?: string) => void
  onFill: () => void
}) {
  const { cfg } = data.work
  const map = dayTotals(data.work.shifts, cfg)
  const sum = summarize(monthDays(map, month), cfg)
  const weeks = monthWeeks(map, month, cfg)
  const cells = calendarGrid(month)
  const today = todayStr()
  const clockedToday = !!map[today]
  const hasSchedule = scheduleOn(cfg)
  const rot = modoOf(cfg) === "turnos"
  const hasAny = hasAnySchedule(cfg)
  const thisMonday = weekStart(today)
  const planned = Object.keys(cfg.weekPlans || {}).filter((k) => k >= thisMonday).sort()
  const todayPlan = planFor(today, cfg)
  const clockLabel = clockedToday
    ? "Añadir otro turno hoy"
    : todayPlan
      ? `Fichar hoy · ${todayPlan.ini}–${todayPlan.fin}`
      : todayPlan === null
        ? "Hoy libre · apuntar turno"
        : modoOf(cfg) === "turnos"
          ? "Fichar hoy · elegir turno"
          : `Fichar hoy · ${cfg.ini}–${cfg.fin}`

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
      <div className="grid min-w-0 gap-4">
        <section className="bg-hero-gradient relative overflow-hidden rounded-[28px] p-5 text-hero-foreground">
          <OrbitDeco />
          <p className="relative text-[11px] font-semibold tracking-[0.16em] text-hero-foreground/70 uppercase">
            Horas en {monthLabel(month)}
          </p>
          <p className="relative mt-1 font-heading text-5xl font-semibold tracking-tight tabular-nums">{fmtH(sum.min)}</p>
          <div className="relative mt-3 flex flex-wrap gap-2">
            <Chip tone="glass">{sum.days} días trabajados</Chip>
            <Chip tone={sum.extra ? "gold" : "glass"}>{sum.extra ? `${fmtMin(sum.extra)} extra` : "Sin extras"}</Chip>
            {sum.vacaciones ? <Chip tone="glass">{sum.vacaciones} de vacaciones</Chip> : null}
          </div>
          <div className="relative mt-5 grid grid-cols-[1fr_auto] gap-2.5">
            <Button
              onClick={clockedToday ? () => onDay(today, null) : onClock}
              className="h-12 rounded-2xl bg-gold text-[15px] font-semibold text-[#1f2b2d] hover:bg-gold/90"
            >
              {clockedToday ? <PlusIcon className="size-5" /> : <ClockIcon className="size-5" />}
              {clockLabel}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Configurar jornada"
              onClick={onCfg}
              className="size-12 rounded-2xl border-white/25 bg-white/8 text-white hover:bg-white/15 hover:text-white dark:border-white/25 dark:bg-white/8"
            >
              <Settings2Icon />
            </Button>
          </div>
        </section>

        <WeekStrip cfg={cfg} map={map} today={today} onEdit={onWeekPlan} onRotate={onSchedule} onDay={(d) => onDay(d, null)} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Media por día" value={sum.days ? fmtH(sum.avg) : "—"} />
          <Stat label="Horas normales" value={fmtH(sum.normal)} />
          <Stat
            label="Valor extras"
            value={cfg.precioExtra ? eur(sum.extraPay) : "—"}
            sub={cfg.precioExtra ? `a ${eur(cfg.precioExtra)}/h` : "Pon tu precio en ajustes"}
          />
          <Stat
            label="Bruto estimado"
            value={cfg.precioHora ? eur0(sum.pay) : "—"}
            sub={cfg.precioHora ? "según tus horas" : "Opcional"}
          />
        </div>

        <Card>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between">
              <Eyebrow>Calendario</Eyebrow>
              <span className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <i className="size-2.5 rounded-full bg-good" aria-hidden /> Libre
                </span>
                <span className="flex items-center gap-1">
                  <i className="size-2.5 rounded-full bg-bad" aria-hidden /> Trabajo
                </span>
                <span className="flex items-center gap-1">
                  <i className="size-2.5 rounded-full bg-gold" aria-hidden /> Cubro
                </span>
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {WEEKDAYS.map((w) => (
                <span key={w} className="pb-1 text-[11px] font-semibold text-muted-foreground">
                  {w}
                </span>
              ))}
              {cells.map((d, i) => {
                if (!d) return <span key={i} />
                const t = map[d]
                const tone = dayTone(d, t, cfg)
                const plan = !t ? planFor(d, cfg) || null : null
                const note = data.work.notes?.[d]
                const label =
                  `${+d.slice(8)}: ` +
                  (t
                    ? t.min
                      ? `${t.cubre ? "cubriendo, " : ""}${fmtMin(t.min)}${t.extra ? `, ${fmtMin(t.extra)} extra` : ""}`
                      : t.kinds.map((k) => KIND_LABEL[k]).join(", ")
                    : plan
                      ? `${plan.cubre ? "cubres, " : "turno previsto, "}de ${plan.ini} a ${plan.fin}`
                      : tone.kind === "libre"
                        ? "libre"
                        : "sin registrar") +
                  (note ? `. Nota: ${note}` : "")
                return (
                  <button
                    key={d}
                    type="button"
                    aria-label={label}
                    onClick={() => onDay(d, t?.shifts[0] || null)}
                    className={cn(
                      "relative grid aspect-square min-h-11 content-center justify-items-center rounded-xl text-sm transition-transform active:scale-95 sm:aspect-auto sm:h-14",
                      TONE_CLASS[tone.kind][tone.solid ? "solid" : "soft"],
                      d === today && "outline-2 outline-offset-1 outline-foreground"
                    )}
                  >
                    <span className="font-semibold leading-none">{+d.slice(8)}</span>
                    <span className="mt-0.5 text-[9px] leading-none opacity-80 tabular-nums">
                      {t ? (t.min ? fmtH(t.min).replace(" h", "h") : KIND_LABEL[t.kinds[0]].slice(0, 3)) : plan ? fmtH(planMinutes(plan)).replace(" h", "h") : ""}
                    </span>
                    {note ? <i aria-hidden className="absolute top-1 left-1 size-1.5 rounded-full bg-current opacity-70" /> : null}
                    {t?.extra ? <span aria-hidden className="absolute top-0 right-1 text-[10px] font-bold leading-none">+</span> : null}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Toca un día para cambiarlo o añadir una nota. Color intenso: ya fichado.
              </p>
              {hasAny ? (
                <Button size="sm" variant="outline" className="rounded-full" onClick={onFill}>
                  <WandSparklesIcon /> Rellenar con mi horario
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4">
        <div>
          <SectionTitle>Por semanas</SectionTitle>
          <Card className="py-1">
            <ul className="divide-y">
              {weeks.map((w) => {
                const r = w.target ? w.sum.min / w.target : 0
                return (
                  <li key={w.start} className="grid gap-2 px-4 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">
                        {+w.start.slice(8)} {monthShort(w.start.slice(0, 7))} – {+w.end.slice(8)} {monthShort(w.end.slice(0, 7))}
                        {w.planned ? (
                          <span className="ml-2 rounded-full bg-gold/25 px-2 py-0.5 text-[11px] font-semibold">Planificada</span>
                        ) : w.cycle ? (
                          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">Semana {w.cycle}</span>
                        ) : null}
                      </span>
                      <span className="font-heading text-sm font-semibold tabular-nums">
                        {fmtH(w.sum.min)} <span className="font-normal text-muted-foreground">/ {fmtH(w.target)}</span>
                      </span>
                    </div>
                    <Meter value={r} tone={w.sum.min > w.target ? "gold" : "primary"} label={`Semana del ${w.start}`} />
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{w.sum.days} días</span>
                      {w.sum.extra ? <span className="font-medium text-out">{fmtMin(w.sum.extra)} extra</span> : null}
                      {w.sum.min > w.target ? <span>{fmtMin(w.sum.min - w.target)} por encima de {hasAny ? "tu horario" : "tu jornada"}</span> : null}
                      {w.end >= today ? (
                        <button type="button" className="ml-auto font-medium text-primary underline-offset-2 hover:underline" onClick={() => onWeekPlan(w.start)}>
                          {w.planned ? "Editar horario" : "Planificar"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>

        <Card>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>Mi horario</Eyebrow>
              <Button size="sm" variant={hasSchedule ? "outline" : "default"} className="rounded-full" onClick={onSchedule}>
                <CalendarRangeIcon /> {hasSchedule ? "Editar" : "Configurar"}
              </Button>
            </div>
            {hasSchedule ? (
              <div className="grid gap-2">
                {cfg.schedule!.weeks.map((wk, i) => (
                  <div key={i} className="grid gap-1">
                    {cfg.schedule!.weeks.length > 1 ? (
                      <span className="text-xs font-semibold text-muted-foreground">
                        Semana {i + 1} · {fmtH(cycleWeekMinutes(wk))}
                        {weekIndex(today, cfg.schedule!) === i ? " · esta semana" : ""}
                      </span>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                      {wk.map((p, j) =>
                        p ? (
                          <span key={j} className="rounded-lg bg-primary/10 px-2 py-1 text-xs">
                            <b>{DAY_NAMES[j].slice(0, 3)}</b> {p.ini}–{p.fin}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                ¿Tus turnos se repiten cada pocas semanas? Configura el horario rotativo. ¿Cada semana es distinta? Usa «Planificar
                semana».
              </p>
            )}
            {planned.length ? (
              <div className="grid gap-1.5 border-t pt-2.5">
                <span className="text-xs font-semibold text-muted-foreground">Semanas planificadas</span>
                <div className="flex flex-wrap gap-1.5">
                  {planned.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onWeekPlan(k)}
                      className="rounded-lg bg-gold/20 px-2 py-1 text-xs font-medium hover:bg-gold/30"
                    >
                      {+k.slice(8)} {monthShort(k.slice(0, 7))} · {fmtH(cycleWeekMinutes(cfg.weekPlans![k]))}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-2 text-sm">
            <Eyebrow>{rot ? "Tus turnos" : "Tu jornada"}</Eyebrow>
            {rot ? (
              <>
                {cfg.turnos?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {cfg.turnos.map((t) => (
                      <span key={t.n + t.ini} className="rounded-lg bg-primary/10 px-2 py-1 text-xs">
                        <b>{t.n}</b> {t.ini}–{t.fin}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="text-muted-foreground">
                  {String(cfg.horasSemana).replace(".", ",")} h de contrato a la semana · extra{" "}
                  {reglaOf(cfg) === "semana" ? "al pasar de esas horas" : "al alargar el turno o trabajar sin tocarte"}
                </p>
              </>
            ) : (
              <p>
                {String(cfg.horasDia).replace(".", ",")} h al día · {String(cfg.horasSemana).replace(".", ",")} h a la semana · de{" "}
                {cfg.ini} a {cfg.fin} con {cfg.pausa} min de pausa
              </p>
            )}
            <p className="text-muted-foreground">
              {cfg.precioHora
                ? `Hora normal ${eur(cfg.precioHora)} · hora extra ${eur(cfg.precioExtra || cfg.precioHora)}`
                : "Añade tu precio por hora para estimar lo que deberías cobrar."}
            </p>
            <Button variant="outline" size="sm" className="justify-self-start rounded-full" onClick={onCfg}>
              <Settings2Icon /> Cambiar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Nominas({
  data,
  month,
  onNew,
  onEdit,
}: {
  data: FinanceData
  month: string
  onNew: () => void
  onEdit: (p: Payslip) => void
}) {
  const year = month.slice(0, 4)
  const y = payslipYear(data.payslips, year)
  const sorted = [...data.payslips].sort((a, b) => b.m.localeCompare(a.m))
  const last12 = [...sorted].slice(0, 12).reverse()
  const latest = sorted[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="grid min-w-0 gap-4">
        <section className="bg-hero-gradient relative overflow-hidden rounded-[28px] p-5 text-hero-foreground">
          <OrbitDeco />
          <p className="relative text-[11px] font-semibold tracking-[0.16em] text-hero-foreground/70 uppercase">Neto cobrado en {year}</p>
          <p className="relative mt-1 font-heading text-5xl font-semibold tracking-tight tabular-nums">{eur0(y.neto)}</p>
          <div className="relative mt-3 flex flex-wrap gap-2">
            <Chip tone="glass">{y.list.length} nóminas</Chip>
            {y.list.length ? <Chip tone="glass">media {eur0(y.avgNeto)}</Chip> : null}
            {y.irpfRate != null ? <Chip tone="gold">IRPF {pct(y.irpfRate)}</Chip> : null}
          </div>
          <Button onClick={onNew} className="relative mt-5 h-12 w-full rounded-2xl bg-gold text-[15px] font-semibold text-[#1f2b2d] hover:bg-gold/90">
            <PlusIcon className="size-5" /> Añadir nómina
          </Button>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Bruto del año" value={eur0(y.bruto)} />
          <Stat label="IRPF retenido" value={eur0(y.irpf)} sub="Te lo pueden devolver en la renta" />
          <Stat label="Seguridad Social" value={eur0(y.ss)} />
          <Stat label="Horas extra pagadas" value={eur0(y.extras)} />
        </div>

        {last12.length ? (
          <Card>
            <CardContent className="grid gap-3">
              <div className="flex items-baseline justify-between">
                <Eyebrow>Neto por mes</Eyebrow>
                {y.list.length ? (
                  <span className="text-xs text-muted-foreground">
                    de {eur0(y.minNeto)} a {eur0(y.maxNeto)}
                  </span>
                ) : null}
              </div>
              <MiniBars
                height={130}
                data={last12.map((p) => ({
                  key: p.id,
                  label: monthShort(p.m),
                  value: p.neto,
                  display: eur(p.neto),
                  highlight: p.id === latest?.id,
                }))}
                onSelect={(id) => {
                  const p = data.payslips.find((x) => x.id === id)
                  if (p) onEdit(p)
                }}
              />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <i className="size-2 rounded-full bg-gold" aria-hidden /> Última nómina. Tu neto cambia sobre todo por las horas
                extra y por la retención de IRPF.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4">
        <div>
          <SectionTitle>Historial</SectionTitle>
          <Card className="py-1">
            {sorted.length ? (
              <ul className="divide-y">
                {sorted.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onEdit(p)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-in/12 text-in">
                        <FileTextIcon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium first-letter:uppercase">{monthLabel(p.m)}</span>
                        <span className="block text-xs text-muted-foreground">
                          Bruto {eur(p.bruto)}
                          {p.bruto && p.irpf ? ` · IRPF ${pct(p.irpf / p.bruto)}` : ""}
                          {p.extras ? ` · extras ${eur(p.extras)}` : ""}
                        </span>
                      </span>
                      <span className="font-heading font-semibold text-pos tabular-nums">+{eur(p.neto)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid justify-items-center gap-3 px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Apunta tus nóminas para ver cuánto te retienen de IRPF y cómo cambia tu sueldo cada mes.
                </p>
                <Button onClick={onNew} className="rounded-full">
                  Añadir nómina
                </Button>
              </div>
            )}
          </Card>
        </div>
        <Card>
          <CardContent className="grid gap-1.5 text-sm">
            <Eyebrow>¿Por qué varía mi nómina?</Eyebrow>
            <p className="text-muted-foreground">
              El <b className="text-foreground">IRPF</b> es un adelanto de tu declaración de la renta: la empresa retiene un porcentaje
              según lo que prevé que ganes en el año. Si cobras horas extra o cambia tu situación, el porcentaje se ajusta y el neto
              sube o baja. Lo retenido de más te lo devuelven en la renta.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
