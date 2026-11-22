"use client"

import * as React from "react"
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BugIcon,
  ChevronRightIcon,
  ClockIcon,
  FileTextIcon,
  PiggyBankIcon,
  SparklesIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CatIcon, Chip, Eyebrow, Meter, MiniBars, OrbitDeco, SectionTitle, WEEKDAYS, WEEKDAY_NAMES, useCountUp } from "@/components/finanzas/kit"
import {
  CUR,
  MINUS,
  addMonths,
  balanceUpTo,
  catMap,
  eur,
  eur0,
  eurM,
  eurS,
  hormigaStats,
  monthStats,
  pad,
  pct,
  pendingRecs,
  todayStr,
  ym,
  type FinanceData,
  type Recurring,
  type Tx,
  type TxType,
} from "@/lib/finance"
import { addDays, dayTotals, fmtH, fmtMin, monthDays, netPerHour, summarize, weekStart } from "@/lib/work"
import { Orbi } from "@/components/finanzas/orbi"
import { cn } from "@/lib/utils"

export type HomeGo = "resumen" | "movimientos" | "trabajo" | "nominas" | "hormiga" | "metas" | "presupuesto"

function greeting() {
  const h = new Date().getHours()
  return h < 6 ? "Buenas noches" : h < 13 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches"
}

export function HomeView({
  data,
  demo,
  onNewTx,
  onOpenTx,
  onGo,
  onClock,
  onRegisterRec,
  onRegisterAll,
  profileCard,
}: {
  data: FinanceData
  demo: boolean
  onNewTx: (t: TxType) => void
  onOpenTx: (t: Tx) => void
  onGo: (v: HomeGo) => void
  onClock: () => void
  onRegisterRec: (r: Recurring) => void
  onRegisterAll: (rs: Recurring[]) => void
  profileCard?: { onStart: () => void; onDismiss: () => void }
}) {
  const cur = CUR()
  const today = todayStr()
  const dayN = +today.slice(8)
  const txs = data.months[cur] || []
  const st = monthStats(txs)
  const total = balanceUpTo(data.months, data.settings.saldoInicial, cur)
  const cm = catMap(data.settings.cats)

  // Gasto hasta hoy frente al mismo día del mes pasado.
  const prevM = addMonths(cur, -1)
  const prevSameDay = (data.months[prevM] || [])
    .filter((t) => t.t === "g" && +t.d.slice(8) <= dayN)
    .reduce((a, t) => a + t.c, 0)
  const vsPrev = prevSameDay ? (st.exp - prevSameDay) / prevSameDay : null

  // Últimos 7 días.
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const spentByDay: Record<string, number> = {}
  for (const d of week)
    spentByDay[d] = (data.months[ym(d)] || []).filter((t) => t.d === d && t.t === "g").reduce((a, t) => a + t.c, 0)
  const weekTotal = week.reduce((a, d) => a + spentByDay[d], 0)
  const maxDay = week.reduce((a, d) => (spentByDay[d] > spentByDay[a] ? d : a), week[0])
  const wdOf = (d: string) => {
    const [y, m, dd] = d.split("-").map(Number)
    return (new Date(y, m - 1, dd).getDay() + 6) % 7
  }

  // Trabajo.
  const map = dayTotals(data.work.shifts, data.work.cfg)
  const ws = weekStart(today)
  const weekDays = Array.from({ length: 7 }, (_, i) => map[addDays(ws, i)]).filter(Boolean)
  const wk = summarize(weekDays, data.work.cfg)
  const mo = summarize(monthDays(map, cur), data.work.cfg)
  const target = Math.round(data.work.cfg.horasSemana * 60)
  const clockedToday = !!map[today]

  const hs = hormigaStats(data, cur)
  const pend = pendingRecs(data.settings.recs, txs)
  const saved = data.goals.reduce((a, g) => a + Math.max(0, g.ah), 0)
  const perHour = netPerHour(data)
  const ahorroMes = data.settings.perfil?.ahorroMes || 0
  const ahorrado = Math.max(0, st.bal)

  const shownTotal = useCountUp(total)
  const tip = buildTip({ hs, st, vsPrev, mo, perHour, rate: st.rate })

  return (
    <div className="view-in grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="grid min-w-0 gap-4">
        <div className="px-1">
          <Eyebrow>{greeting()}</Eyebrow>
          <p className="font-heading text-2xl font-semibold tracking-tight">
            {data.settings.nombre ? data.settings.nombre : "Tu dinero hoy"}
          </p>
        </div>

        {/* Tarjeta principal */}
        <section
          data-tour="saldo"
          aria-label="Saldo"
          className="bg-hero-gradient relative overflow-hidden rounded-[28px] p-5 text-hero-foreground shadow-[0_20px_40px_-20px_rgb(13_138_158/0.6)]"
        >
          <OrbitDeco />
          <div className="relative flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-hero-foreground/70 uppercase">Saldo total</p>
            {txs.length ? (
              <Chip tone="gold">
                {st.bal >= 0 ? <TrendingUpIcon className="size-3.5" /> : <TrendingDownIcon className="size-3.5" />}
                {eurS(st.bal)} este mes
              </Chip>
            ) : null}
          </div>
          <p className="relative mt-2 font-heading text-[clamp(2.4rem,11vw,3.4rem)] leading-none font-semibold tracking-tight tabular-nums">
            {eurM(shownTotal)}
          </p>
          <p className="relative mt-2 text-sm text-hero-foreground/75">
            Entran {eur0(st.inc)} · salen {eur0(st.exp)}
            {st.rate != null && st.inc > 0 ? ` · ahorras ${pct(Math.max(0, st.rate))}` : ""}
          </p>
          <div data-tour="botones" className="relative mt-5 grid grid-cols-2 gap-2.5">
            <Button
              onClick={() => onNewTx("i")}
              className="h-12 rounded-2xl bg-gold text-[15px] font-semibold text-[#1f2b2d] hover:bg-gold/90"
            >
              <ArrowDownLeftIcon className="size-5" />
              Ingreso
            </Button>
            <Button
              onClick={() => onNewTx("g")}
              variant="outline"
              className="h-12 rounded-2xl border-white/25 bg-white/8 text-[15px] font-semibold text-white hover:bg-white/15 hover:text-white dark:border-white/25 dark:bg-white/8"
            >
              <ArrowUpRightIcon className="size-5" />
              Gasto
            </Button>
          </div>
        </section>

        {/* Accesos rápidos */}
        <nav data-tour="accesos" aria-label="Accesos rápidos" className="grid grid-cols-4 gap-2">
          {(
            [
              ["Fichar", ClockIcon, clockedToday ? () => onGo("trabajo") : onClock, true],
              ["Nóminas", FileTextIcon, () => onGo("nominas"), false],
              ["Hormiga", BugIcon, () => onGo("hormiga"), false],
              ["Ahorro", PiggyBankIcon, () => onGo("metas"), false],
            ] as const
          ).map(([label, Icon, fn, hi]) => (
            <button
              key={label}
              type="button"
              onClick={fn}
              className="grid justify-items-center gap-1.5 rounded-2xl py-1 text-xs font-medium text-foreground/80 active:scale-[0.97]"
            >
              <span
                className={cn(
                  "grid size-14 place-items-center rounded-2xl ring-1 ring-foreground/8 transition-colors",
                  hi && !clockedToday ? "bg-gold text-[#1f2b2d] ring-0" : "bg-card"
                )}
              >
                <Icon className="size-5.5" strokeWidth={1.9} />
              </span>
              {label === "Fichar" && clockedToday ? "Fichado" : label}
            </button>
          ))}
        </nav>

        {profileCard ? (
          <section className="relative flex items-center gap-3 overflow-hidden rounded-3xl bg-card p-4 pr-10 ring-1 ring-glow/40">
            <Orbi mood="wave" className="w-14 shrink-0" />
            <div className="min-w-0">
              <p className="font-heading font-semibold">Personaliza Orbe</p>
              <p className="text-sm text-muted-foreground">Cuéntame tu sueldo, jornada y metas. Menos de un minuto.</p>
              <Button size="sm" className="mt-2 rounded-full" onClick={profileCard.onStart}>
                Empezar
              </Button>
            </div>
            <button
              type="button"
              aria-label="Ocultar esta tarjeta"
              onClick={profileCard.onDismiss}
              className="absolute top-3 right-3 grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <XIcon className="size-4" />
            </button>
          </section>
        ) : null}

        {ahorroMes ? (
          <Card>
            <CardContent className="grid gap-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <Eyebrow>Tu objetivo de ahorro este mes</Eyebrow>
                <span className="text-xs text-muted-foreground">{pct(Math.min(1, ahorrado / ahorroMes))}</span>
              </div>
              <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
                {eur(ahorrado)} <span className="text-base font-normal text-muted-foreground">de {eur(ahorroMes)}</span>
              </p>
              <Meter value={ahorrado / ahorroMes} tone={ahorrado >= ahorroMes ? "good" : "gold"} label="Ahorro del mes" />
              <p className="text-xs text-muted-foreground">
                {ahorrado >= ahorroMes
                  ? "¡Objetivo conseguido este mes! 🎉"
                  : `Te faltan ${eur(ahorroMes - ahorrado)}. Cuenta lo que entra menos lo que sale este mes.`}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Gasto de la semana */}
        <Card data-tour="gasto7">
          <CardContent className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow>Gasto del mes</Eyebrow>
                <p className="mt-1 font-heading text-3xl font-semibold tracking-tight tabular-nums">{eur(st.exp)}</p>
              </div>
              {vsPrev != null && isFinite(vsPrev) ? (
                <Chip tone={vsPrev <= 0 ? "good" : "bad"}>
                  {vsPrev <= 0 ? <TrendingDownIcon className="size-3.5" /> : <TrendingUpIcon className="size-3.5" />}
                  {pct(Math.abs(vsPrev))} {vsPrev <= 0 ? "menos" : "más"}
                </Chip>
              ) : null}
            </div>
            <MiniBars
              height={110}
              data={week.map((d) => ({
                key: d,
                label: WEEKDAYS[wdOf(d)],
                value: spentByDay[d],
                display: eur(spentByDay[d]),
                highlight: weekTotal > 0 && d === maxDay,
              }))}
            />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <i className="size-2 rounded-full bg-gold" aria-hidden />
              {weekTotal > 0
                ? `El ${WEEKDAY_NAMES[wdOf(maxDay)]} fue tu día de más gasto · ${eur(weekTotal)} en 7 días`
                : "Sin gastos en los últimos 7 días"}
              {vsPrev != null && isFinite(vsPrev) ? ` · comparado con el mes pasado a día ${pad(dayN)}` : ""}
            </p>
          </CardContent>
        </Card>

        {/* Consejo */}
        {tip ? (
          <section className="relative overflow-hidden rounded-3xl bg-hero p-5 text-hero-foreground">
            <div aria-hidden className="absolute -right-8 -bottom-10 size-36 rounded-full bg-glow/20 blur-2xl" />
            <Chip tone="gold" className="mb-3">
              <SparklesIcon className="size-3.5" />
              Consejo
            </Chip>
            <p className="relative font-serif text-[19px] leading-snug italic">{tip.text}</p>
            {tip.go ? (
              <button
                type="button"
                onClick={() => onGo(tip.go!)}
                className="relative mt-3 inline-flex items-center gap-1 text-sm font-medium text-glow"
              >
                {tip.cta}
                <ChevronRightIcon className="size-4" />
              </button>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4">
        {/* Trabajo */}
        <Card data-tour="trabajo">
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Eyebrow>Trabajo · esta semana</Eyebrow>
                <p className="mt-1 font-heading text-2xl font-semibold tracking-tight tabular-nums">
                  {fmtH(wk.min)} <span className="text-base font-normal text-muted-foreground">de {fmtH(target)}</span>
                </p>
              </div>
              <Button size="sm" variant={clockedToday ? "outline" : "default"} className="rounded-full" onClick={clockedToday ? () => onGo("trabajo") : onClock}>
                <ClockIcon />
                {clockedToday ? "Ver" : "Fichar hoy"}
              </Button>
            </div>
            <Meter value={target ? wk.min / target : 0} tone={wk.min > target ? "gold" : "primary"} label="Horas de la semana" />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <MiniStat k="Días este mes" v={String(mo.days)} />
              <MiniStat k="Horas mes" v={fmtH(mo.min)} />
              <MiniStat k="Extras mes" v={mo.extra ? fmtMin(mo.extra) : "0 h"} accent={mo.extra > 0} />
            </div>
          </CardContent>
        </Card>

        {/* Hormiga + ahorro */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            data-tour="hormiga"
            onClick={() => onGo("hormiga")}
            className="grid gap-1 rounded-3xl bg-card p-4 text-left ring-1 ring-foreground/8 active:scale-[0.98]"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BugIcon className="size-3.5" /> Gastos hormiga
            </span>
            <span className="font-heading text-xl font-semibold tabular-nums">{eur(hs.total)}</span>
            <span className="text-[11px] text-muted-foreground">
              {hs.count} este mes · {eur0(hs.year)}/año
            </span>
          </button>
          <button
            type="button"
            onClick={() => onGo("metas")}
            className="grid gap-1 rounded-3xl bg-card p-4 text-left ring-1 ring-foreground/8 active:scale-[0.98]"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <PiggyBankIcon className="size-3.5" /> Ahorrado
            </span>
            <span className="font-heading text-xl font-semibold tabular-nums">{eur(saved)}</span>
            <span className="text-[11px] text-muted-foreground">
              {data.goals.length} {data.goals.length === 1 ? "meta" : "metas"}
            </span>
          </button>
        </div>

        {pend.length ? (
          <Card>
            <CardContent className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Eyebrow>Fijos pendientes este mes</Eyebrow>
                <Button size="sm" variant="link" className="h-auto p-0" onClick={() => onRegisterAll(pend)}>
                  Apuntar todos
                </Button>
              </div>
              <ul className="divide-y">
                {pend.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2">
                    <CatIcon id={r.cat} income={r.t === "i"} className="size-9 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.n}</span>
                      <span className="text-xs text-muted-foreground">día {r.dia}</span>
                    </span>
                    <span className="font-heading text-sm font-semibold">
                      {r.t === "i" ? "+" : MINUS}
                      {eur(r.c)}
                    </span>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => onRegisterRec(r)}>
                      Apuntar
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {/* Actividad reciente */}
        <div>
          <SectionTitle
            action={
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onGo("movimientos")}>
                Ver todo <ChevronRightIcon />
              </Button>
            }
          >
            Actividad reciente
          </SectionTitle>
          <Card className="gap-0 py-1">
            {txs.length ? (
              <ul className="divide-y">
                {txs.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onOpenTx(t)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <CatIcon id={t.cat} income={t.t === "i"} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{t.n || cm[t.cat]?.n || "Movimiento"}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {cm[t.cat]?.n} · {relDay(t.d, today)}
                        </span>
                      </span>
                      <span className={cn("font-heading font-semibold whitespace-nowrap tabular-nums", t.t === "i" && "text-pos")}>
                        {t.t === "i" ? "+" : MINUS}
                        {eur(t.c)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid justify-items-center gap-3 px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {demo ? "" : "Aún no hay nada apuntado este mes. Empieza por tu nómina o tu último café."}
                </p>
                <Button onClick={() => onNewTx("g")} className="rounded-full">
                  Añadir movimiento
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="grid gap-0.5 rounded-xl bg-muted/70 px-2.5 py-2">
      <span className="text-[11px] text-muted-foreground">{k}</span>
      <span className={cn("font-heading font-semibold tabular-nums", accent && "text-out")}>{v}</span>
    </div>
  )
}

function relDay(d: string, today: string) {
  if (d === today) return "hoy"
  if (d === addDays(today, -1)) return "ayer"
  const [, m, dd] = d.split("-").map(Number)
  return `${dd}/${pad(m)}`
}

function buildTip({
  hs,
  st,
  vsPrev,
  mo,
  perHour,
  rate,
}: {
  hs: ReturnType<typeof hormigaStats>
  st: ReturnType<typeof monthStats>
  vsPrev: number | null
  mo: ReturnType<typeof summarize>
  perHour: number
  rate: number | null
}): { text: string; go?: HomeGo; cta?: string } | null {
  if (hs.total > 0 && hs.year > 0) {
    const hours = perHour ? hs.total / perHour : 0
    return {
      text:
        hours >= 1
          ? `Tus gastos hormiga de este mes equivalen a ${hours.toLocaleString("es-ES", { maximumFractionDigits: 1 })} horas de trabajo. Al año serían unos ${eur0(hs.year)}.`
          : `Llevas ${eur(hs.total)} en gastos hormiga este mes. A este ritmo, al año serían unos ${eur0(hs.year)}.`,
      go: "hormiga",
      cta: "Ver en qué se van",
    }
  }
  if (vsPrev != null && vsPrev < -0.05)
    return { text: `Vas gastando un ${pct(-vsPrev)} menos que el mes pasado a estas alturas. Buen ritmo.`, go: "resumen", cta: "Ver análisis" }
  if (rate != null && st.inc > 0 && rate < 0.2)
    return {
      text: "Intenta apartar al menos el 20 % de lo que entra. Empieza con una meta pequeña y automática.",
      go: "metas",
      cta: "Crear una meta",
    }
  if (mo.extra > 0)
    return { text: `Llevas ${fmtMin(mo.extra)} extra este mes. Comprueba que aparecen en tu próxima nómina.`, go: "trabajo", cta: "Ver jornadas" }
  return null
}
