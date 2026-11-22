"use client"

import * as React from "react"
import { BugIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CatIcon, Chip, Eyebrow, Meter, MiniBars, SectionTitle, Stat, WEEKDAYS, WEEKDAY_NAMES } from "@/components/finanzas/kit"
import { MINUS, catMap, eur, eur0, fmtPlain, hormigaStats, monthLabel, pct, type FinanceData, type Tx } from "@/lib/finance"
import { dayTotals, monthDays, summarize } from "@/lib/work"

export function HormigaView({
  data,
  month,
  onOpenTx,
  onMax,
}: {
  data: FinanceData
  month: string
  onOpenTx: (t: Tx) => void
  onMax: (raw: string) => void
}) {
  const hs = hormigaStats(data, month)
  const cm = catMap(data.settings.cats)
  const [max, setMax] = React.useState(fmtPlain(data.settings.hormigaMax))
  const top = hs.top.slice(0, 6)
  const topMax = Math.max(1, ...top.map((t) => t.c))
  const peak = hs.weekday.indexOf(Math.max(...hs.weekday))

  // ¿Cuántas horas de trabajo cuesta? Neto de la última nómina ÷ horas del mes trabajado.
  const map = dayTotals(data.work.shifts, data.work.cfg)
  const lastPs = [...data.payslips].sort((a, b) => b.m.localeCompare(a.m))[0]
  const psHours = lastPs ? summarize(monthDays(map, lastPs.m), data.work.cfg).min / 60 : 0
  const netPerHour = lastPs && psHours ? lastPs.neto / psHours : 0
  const workHours = netPerHour ? hs.total / netPerHour : 0

  return (
    <div className="view-in grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="grid min-w-0 gap-4">
        <section className="bg-hero-gradient relative overflow-hidden rounded-[28px] p-5 text-hero-foreground">
          <div aria-hidden className="absolute -top-14 -right-14 size-44 rounded-full border-[14px] border-glow/25" />
          <p className="relative flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-hero-foreground/70 uppercase">
            <BugIcon className="size-3.5" /> Gastos hormiga · {monthLabel(month)}
          </p>
          <p className="relative mt-1 font-heading text-5xl font-semibold tracking-tight tabular-nums">{eur(hs.total)}</p>
          <div className="relative mt-3 flex flex-wrap gap-2">
            <Chip tone="glass">{hs.count} pequeños gastos</Chip>
            {hs.share != null ? <Chip tone="glass">{pct(hs.share)} de lo que gastas</Chip> : null}
            {hs.year ? <Chip tone="gold">≈ {eur0(hs.year)} al año</Chip> : null}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Media al día" value={eur(hs.perDay)} />
          <Stat
            label="En horas de trabajo"
            value={workHours ? `${workHours.toLocaleString("es-ES", { maximumFractionDigits: 1 })} h` : "—"}
            sub={workHours ? "según tu última nómina" : "Apunta nómina y jornadas"}
          />
          <Stat label="Si los reduces a la mitad" value={`+${eur0(hs.year / 2)}`} sub="ahorrarías al año" className="col-span-2" />
        </div>

        <Card>
          <CardContent className="grid gap-3">
            <Eyebrow>Qué día de la semana caes más</Eyebrow>
            <MiniBars
              height={110}
              data={hs.weekday.map((v, i) => ({
                key: String(i),
                label: WEEKDAYS[i],
                value: v,
                display: eur(v),
                highlight: hs.total > 0 && i === peak,
              }))}
            />
            {hs.total > 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <i className="size-2 rounded-full bg-gold" aria-hidden /> Los {WEEKDAY_NAMES[peak]} son tu punto débil.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-2">
            <Eyebrow>¿Qué cuenta como hormiga?</Eyebrow>
            <p className="text-sm text-muted-foreground">
              Gastos que no son fijos ni necesidades y que cuestan como mucho este importe. Puedes marcar o desmarcar cualquier gasto a
              mano al editarlo.
            </p>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                onMax(max)
              }}
            >
              <Input
                aria-label="Importe máximo de un gasto hormiga"
                inputMode="decimal"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="h-10 w-28 font-mono"
              />
              <span className="text-sm text-muted-foreground">€ como máximo</span>
              <Button type="submit" size="sm" variant="outline" className="ml-auto rounded-full">
                Guardar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4">
        <div>
          <SectionTitle>En qué se van</SectionTitle>
          <Card>
            <CardContent>
              {top.length ? (
                <ul className="grid gap-3.5">
                  {top.map((t) => (
                    <li key={t.name} className="grid gap-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{t.name}</span>
                        <span className="font-heading font-semibold tabular-nums">{eur(t.c)}</span>
                      </div>
                      <Meter value={t.c / topMax} tone="gold" label={t.name} />
                      <span className="text-xs text-muted-foreground">
                        {t.n} {t.n === 1 ? "vez" : "veces"} · {eur(t.c / t.n)} de media
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No hay gastos hormiga este mes. ¡Bien hecho!</p>
              )}
            </CardContent>
          </Card>
        </div>

        {hs.txs.length ? (
          <div>
            <SectionTitle>Todos los de este mes</SectionTitle>
            <Card className="py-1">
              <ul className="divide-y">
                {hs.txs.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onOpenTx(t)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <CatIcon id={t.cat} className="size-9 rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{t.n || cm[t.cat]?.n}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.d.slice(8)}/{t.d.slice(5, 7)} · {cm[t.cat]?.n}
                        </span>
                      </span>
                      <span className="font-heading text-sm font-semibold tabular-nums">
                        {MINUS}
                        {eur(t.c)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
