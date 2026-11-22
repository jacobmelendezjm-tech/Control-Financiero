"use client"

import * as React from "react"
import { ClockIcon, FileTextIcon, PlusIcon, Settings2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Chip, Eyebrow, Meter, MiniBars, SectionTitle, Stat, WEEKDAYS } from "@/components/finanzas/kit"
import { eur, eur0, monthLabel, monthShort, pct, todayStr, type FinanceData, type Payslip, type Shift } from "@/lib/finance"
import {
  KIND_LABEL,
  calendarGrid,
  dayTotals,
  fmtH,
  fmtMin,
  monthDays,
  monthWeeks,
  payslipYear,
  summarize,
} from "@/lib/work"
import { cn } from "@/lib/utils"

export type WorkTab = "jornadas" | "nominas"

export function WorkView({
  data,
  month,
  tab,
  onTab,
  onDay,
  onClock,
  onCfg,
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
        <Jornadas data={data} month={month} onDay={onDay} onClock={onClock} onCfg={onCfg} />
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
}: {
  data: FinanceData
  month: string
  onDay: (d: string, s: Shift | null) => void
  onClock: () => void
  onCfg: () => void
}) {
  const { cfg } = data.work
  const map = dayTotals(data.work.shifts, cfg)
  const sum = summarize(monthDays(map, month), cfg)
  const weeks = monthWeeks(map, month, cfg)
  const cells = calendarGrid(month)
  const today = todayStr()
  const maxMin = Math.max(Math.round(cfg.horasDia * 60), ...Object.values(map).map((t) => t.min))
  const clockedToday = !!map[today]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
      <div className="grid min-w-0 gap-4">
        <section className="bg-hero-gradient relative overflow-hidden rounded-[28px] p-5 text-hero-foreground">
          <div aria-hidden className="absolute -top-14 -right-14 size-44 rounded-full border-[14px] border-glow/25" />
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
              {clockedToday ? "Añadir otro turno hoy" : `Fichar hoy · ${cfg.ini}–${cfg.fin}`}
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
              <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <i className="size-2 rounded-full bg-gold" aria-hidden /> extra
                </span>
                <span className="flex items-center gap-1">
                  <i className="size-2 rounded-full bg-glow" aria-hidden /> libre/vac.
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
                const intensity = t?.min ? 0.18 + 0.62 * Math.min(1, t.min / maxMin) : 0
                const off = t && !t.min && t.kinds.some((k) => k !== "trabajo")
                const label = t
                  ? t.min
                    ? `${+d.slice(8)}: ${fmtMin(t.min)}${t.extra ? `, ${fmtMin(t.extra)} extra` : ""}`
                    : `${+d.slice(8)}: ${t.kinds.map((k) => KIND_LABEL[k]).join(", ")}`
                  : `${+d.slice(8)}: sin registrar`
                return (
                  <button
                    key={d}
                    type="button"
                    aria-label={label}
                    onClick={() => onDay(d, t?.shifts[0] || null)}
                    className={cn(
                      "relative grid aspect-square min-h-11 content-center justify-items-center rounded-xl text-sm transition-transform active:scale-95",
                      !t && "bg-muted/60 text-muted-foreground",
                      off && "bg-glow/15 text-foreground ring-1 ring-glow/40",
                      d === today && "ring-2 ring-primary"
                    )}
                    style={t?.min ? { background: `color-mix(in oklab, var(--primary) ${Math.round(intensity * 100)}%, var(--card))` } : undefined}
                  >
                    <span className={cn("font-semibold leading-none", intensity > 0.55 && "text-white")}>{+d.slice(8)}</span>
                    <span
                      className={cn(
                        "mt-0.5 font-mono text-[9px] leading-none text-muted-foreground",
                        intensity > 0.55 && "text-white/85",
                        intensity > 0 && intensity <= 0.55 && "text-foreground/70"
                      )}
                    >
                      {t ? (t.min ? fmtH(t.min).replace(" h", "h") : KIND_LABEL[t.kinds[0]].slice(0, 3)) : ""}
                    </span>
                    {t?.extra ? <i aria-hidden className="absolute top-1 right-1 size-1.5 rounded-full bg-gold" /> : null}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">Toca un día para registrar o editar la jornada.</p>
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
                      </span>
                      <span className="font-heading text-sm font-semibold tabular-nums">
                        {fmtH(w.sum.min)} <span className="font-normal text-muted-foreground">/ {fmtH(w.target)}</span>
                      </span>
                    </div>
                    <Meter value={r} tone={w.sum.min > w.target ? "gold" : "primary"} label={`Semana del ${w.start}`} />
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{w.sum.days} días</span>
                      {w.sum.extra ? <span className="font-medium text-out">{fmtMin(w.sum.extra)} extra</span> : null}
                      {w.sum.min > w.target ? <span>{fmtMin(w.sum.min - w.target)} por encima de tu jornada</span> : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>

        <Card>
          <CardContent className="grid gap-2 text-sm">
            <Eyebrow>Tu jornada</Eyebrow>
            <p>
              {String(cfg.horasDia).replace(".", ",")} h al día · {String(cfg.horasSemana).replace(".", ",")} h a la semana · de{" "}
              {cfg.ini} a {cfg.fin} con {cfg.pausa} min de pausa
            </p>
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
          <div aria-hidden className="absolute -top-14 -right-14 size-44 rounded-full border-[14px] border-glow/25" />
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
