"use client"

import * as React from "react"
import { CalendarRangeIcon, ChevronRightIcon, PlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Actions, Field, FormError, Shell } from "@/components/finanzas/dialogs"
import {
  addMonths,
  eur,
  fmtPlain,
  monthLabel,
  parseMoney,
  parsePos,
  retenciones,
  sim,
  uid,
  type ExtraRegla,
  type Payslip,
  type Shift,
  type ShiftKind,
  type Turno,
  type WorkCfg,
  type WorkModo,
} from "@/lib/finance"
import { KIND_LABEL, SS_RATE, fmtMin, modoOf, planFor, reglaOf, planMinutes, scheduleOn, shiftMinutes, toMin } from "@/lib/work"
import { cn } from "@/lib/utils"

const KINDS: ShiftKind[] = ["trabajo", "vacaciones", "festivo", "baja", "libre"]

function Segmented<T extends string>({
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

/* ---------- jornada ---------- */
export function ShiftDialog({
  open,
  shift,
  date,
  cfg,
  sameDay,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  shift: Shift | null
  date: string
  cfg: WorkCfg
  sameDay: Shift[]
  onClose: () => void
  onSave: (s: Shift) => void
  onDelete: (s: Shift) => void
}) {
  const plan0 = planFor(shift?.d || date, cfg)
  const [kind, setKind] = React.useState<ShiftKind>(shift?.kind || "trabajo")
  const [d, setD] = React.useState(shift?.d || date)
  const [ini, setIni] = React.useState(shift?.ini || plan0?.ini || cfg.ini)
  const [fin, setFin] = React.useState(shift?.fin || plan0?.fin || cfg.fin)
  const [pausa, setPausa] = React.useState(String(shift?.pausa ?? (plan0 ? plan0.pausa : plan0 === null ? 0 : cfg.pausa)))
  const [manual, setManual] = React.useState(shift?.ex != null)
  const [exH, setExH] = React.useState(shift?.ex != null ? String(+(shift.ex / 60).toFixed(2)).replace(".", ",") : "")
  const [n, setN] = React.useState(shift?.n || "")
  const [err, setErr] = React.useState("")

  const draft: Shift = { id: "x", d, kind, ini, fin, pausa: Number(pausa) || 0 }
  const min = shiftMinutes(draft)
  const others = sameDay.filter((s) => s.id !== shift?.id).reduce((a, s) => a + shiftMinutes(s), 0)
  const plan = planFor(d, cfg)
  const dayTarget = plan === undefined ? Math.round(cfg.horasDia * 60) : plan ? planMinutes(plan) : 0
  const autoExtra = Math.max(0, min + others - dayTarget)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return setErr("Elige una fecha.")
    const s: Shift = { id: shift?.id || "s" + uid(), d, kind, ini: "", fin: "", pausa: 0, n: n.trim().slice(0, 60) || undefined }
    if (kind === "trabajo") {
      if (toMin(ini) == null || toMin(fin) == null) return setErr("Indica la hora de entrada y de salida.")
      const p = Number(pausa)
      if (!Number.isFinite(p) || p < 0 || p > 600) return setErr("La pausa debe ser un número de minutos.")
      s.ini = ini
      s.fin = fin
      s.pausa = Math.round(p)
      if (shiftMinutes(s) <= 0) return setErr("La salida tiene que ser posterior a la entrada (o la pausa es demasiado larga).")
      if (manual) {
        const h = parseMoney(exH)
        if (h == null || h < 0) return setErr("Escribe las horas extra, por ejemplo 1,5.")
        s.ex = Math.round((h / 100) * 60)
      }
    }
    onSave(s)
  }

  return (
    <Shell open={open} onClose={onClose} title={shift ? "Editar jornada" : "Registrar jornada"}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Segmented label="Tipo de día" value={kind} onChange={setKind} options={KINDS.map((k) => ({ v: k, l: KIND_LABEL[k] }))} />
        <Field label="Fecha" htmlFor="sh-d">
          <Input id="sh-d" type="date" value={d} onChange={(e) => setD(e.target.value)} />
        </Field>
        {kind === "trabajo" ? (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <Field label="Entrada" htmlFor="sh-ini">
                <Input id="sh-ini" type="time" value={ini} onChange={(e) => setIni(e.target.value)} className="h-11 font-mono" />
              </Field>
              <Field label="Salida" htmlFor="sh-fin">
                <Input id="sh-fin" type="time" value={fin} onChange={(e) => setFin(e.target.value)} className="h-11 font-mono" />
              </Field>
              <Field label="Pausa (min)" htmlFor="sh-p">
                <Input id="sh-p" inputMode="numeric" value={pausa} onChange={(e) => setPausa(e.target.value)} className="h-11 font-mono" />
              </Field>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/70 px-3 py-2.5 text-sm">
              <span>
                Trabajas <b className="font-mono">{fmtMin(min)}</b>
                {others ? <span className="text-muted-foreground"> (+{fmtMin(others)} en otro turno)</span> : null}
              </span>
              {!manual ? (
                <span className={cn("font-medium", autoExtra ? "text-out" : "text-muted-foreground")}>
                  {autoExtra ? `${fmtMin(autoExtra)} extra` : "Sin horas extra"}
                </span>
              ) : null}
            </div>
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox checked={manual} onCheckedChange={(v) => setManual(!!v)} />
              Indicar las horas extra a mano
            </Label>
            {manual ? (
              <Field label="Horas extra de este turno" htmlFor="sh-ex">
                <Input id="sh-ex" inputMode="decimal" placeholder="p. ej. 1,5" value={exH} onChange={(e) => setExH(e.target.value)} />
              </Field>
            ) : (
              <p className="-mt-2 text-xs text-muted-foreground">
                {reglaOf(cfg) === "semana"
                  ? `Cuenta como extra lo que pase de tus ${String(cfg.horasSemana).replace(".", ",")} h de la semana.`
                  : plan === undefined
                  ? modoOf(cfg) === "turnos"
                    ? "Lo que pase de tu turno tipo (según la hora de entrada) cuenta como extra."
                    : `Se cuentan como extra las horas que pasan de tu jornada de ${String(cfg.horasDia).replace(".", ",")} h al día.`
                  : plan
                    ? `Según tu horario, ese día te toca de ${plan.ini} a ${plan.fin}. Lo que pase de ahí cuenta como extra.`
                    : "Según tu horario, ese día lo tenías libre: todas las horas cuentan como extra."}
              </p>
            )}
          </>
        ) : null}
        <Field
          label={
            <>
              Nota <span className="font-normal">(opcional)</span>
            </>
          }
          htmlFor="sh-n"
        >
          <Input id="sh-n" maxLength={60} placeholder="p. ej. inventario, turno de tarde" value={n} onChange={(e) => setN(e.target.value)} />
        </Field>
        <FormError msg={err} />
        <Actions onCancel={onClose} del={shift ? () => onDelete(shift) : undefined} />
      </form>
    </Shell>
  )
}

/* ---------- nómina ---------- */
export interface PayslipSaveResult {
  p: Payslip
  asIncome: boolean
}

export function PayslipDialog({
  open,
  payslip,
  month,
  suggestExtras,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  payslip: Payslip | null
  month: string
  suggestExtras: { min: number; c: number }
  onClose: () => void
  onSave: (r: PayslipSaveResult) => void
  onDelete: (p: Payslip) => void
}) {
  const prev = addMonths(month, -1)
  const [m, setM] = React.useState(payslip?.m || prev)
  const [dPago, setDPago] = React.useState(payslip?.dPago || `${month}-01`)
  const [bruto, setBruto] = React.useState(payslip ? fmtPlain(payslip.bruto) : "")
  const [irpfPct, setIrpfPct] = React.useState(
    payslip && payslip.bruto ? String(+((payslip.irpf / payslip.bruto) * 100).toFixed(2)).replace(".", ",") : ""
  )
  const [ss, setSs] = React.useState(payslip ? fmtPlain(payslip.ss) : "")
  const [otros, setOtros] = React.useState(payslip?.otros ? fmtPlain(payslip.otros) : "")
  const [neto, setNeto] = React.useState(payslip ? fmtPlain(payslip.neto) : "")
  const [netoTouched, setNetoTouched] = React.useState(!!payslip)
  const [extras, setExtras] = React.useState(payslip?.extras ? fmtPlain(payslip.extras) : suggestExtras.c ? fmtPlain(suggestExtras.c) : "")
  const [asIncome, setAsIncome] = React.useState(!payslip || !!payslip.txId)
  const [err, setErr] = React.useState("")

  const b = parsePos(bruto) || 0
  const pctV = (parseMoney(irpfPct) ?? 0) / 100 // «12,5» → 12.5
  const irpfC = Math.round((b * pctV) / 100)
  const ssC = ss.trim() ? (parseMoney(ss) ?? 0) : Math.round(b * SS_RATE)
  const otrosC = parseMoney(otros) ?? 0
  const netoCalc = b - irpfC - ssC - otrosC
  const netoShown = netoTouched ? neto : b ? fmtPlain(netoCalc) : ""

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{4}-\d{2}$/.test(m)) return setErr("Elige el mes de la nómina.")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dPago)) return setErr("Elige el día en que la cobraste.")
    const n = parsePos(netoShown)
    if (!n) return setErr("Escribe el neto que cobraste, por ejemplo 880.")
    if (b && n > b) return setErr("El neto no puede ser mayor que el bruto.")
    const p: Payslip = {
      id: payslip?.id || "p" + uid(),
      m,
      dPago,
      bruto: b || n,
      irpf: b ? irpfC : 0,
      ss: b ? ssC : 0,
      otros: b ? otrosC : 0,
      neto: n,
      extras: parseMoney(extras) ?? 0,
      horasExtra: payslip?.horasExtra ?? suggestExtras.min,
      txId: payslip?.txId,
    }
    onSave({ p, asIncome })
  }

  return (
    <Shell
      open={open}
      onClose={onClose}
      title={payslip ? "Editar nómina" : "Añadir nómina"}
      description="Copia los datos de tu nómina. Si solo sabes el neto, escribe solo ese."
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Mes trabajado" htmlFor="ps-m">
            <Input id="ps-m" type="month" value={m} onChange={(e) => setM(e.target.value)} />
          </Field>
          <Field label="Día de cobro" htmlFor="ps-d">
            <Input id="ps-d" type="date" value={dPago} onChange={(e) => setDPago(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={`Bruto (${sim()})`} htmlFor="ps-b">
            <Input id="ps-b" inputMode="decimal" placeholder="1.000" value={bruto} onChange={(e) => setBruto(e.target.value)} className="font-mono" />
          </Field>
          <Field label={`${retenciones().ret} (%)`} htmlFor="ps-i">
            <Input id="ps-i" inputMode="decimal" placeholder="2" value={irpfPct} onChange={(e) => setIrpfPct(e.target.value)} className="font-mono" />
          </Field>
          <Field label={`${retenciones().ss} (${sim()})`} htmlFor="ps-ss">
            <Input
              id="ps-ss"
              inputMode="decimal"
              placeholder={b ? fmtPlain(Math.round(b * SS_RATE)) : "auto"}
              value={ss}
              onChange={(e) => setSs(e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label={`Otros descuentos (${sim()})`} htmlFor="ps-o">
            <Input id="ps-o" inputMode="decimal" placeholder="0" value={otros} onChange={(e) => setOtros(e.target.value)} className="font-mono" />
          </Field>
        </div>
        {b ? (
          <p className="-mt-1 rounded-xl bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
            {retenciones().retLarga}: <b className="font-mono text-foreground">{eur(irpfC)}</b> · {retenciones().ss}:{" "}
            <b className="font-mono text-foreground">{eur(ssC)}</b>
            {ss.trim() ? "" : " (estimada al 6,48 %)"}
          </p>
        ) : null}
        <Field label={`Neto cobrado (${sim()})`} htmlFor="ps-n">
          <Input
            id="ps-n"
            inputMode="decimal"
            placeholder="880"
            value={netoShown}
            onChange={(e) => {
              setNetoTouched(true)
              setNeto(e.target.value)
            }}
            className="h-14 font-mono text-2xl font-semibold md:text-2xl"
          />
        </Field>
        <Field label={`Horas extra pagadas en esta nómina (${sim()})`} htmlFor="ps-x">
          <Input id="ps-x" inputMode="decimal" placeholder="0" value={extras} onChange={(e) => setExtras(e.target.value)} className="font-mono" />
        </Field>
        {suggestExtras.min ? (
          <p className="-mt-2 text-xs text-muted-foreground">
            En {monthLabel(m)} apuntaste {fmtMin(suggestExtras.min)} extra
            {suggestExtras.c ? `, unos ${eur(suggestExtras.c)} según tu precio por hora extra` : ""}.
          </p>
        ) : null}
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={asIncome} onCheckedChange={(v) => setAsIncome(!!v)} />
          Apuntar el neto como ingreso en mis movimientos
        </Label>
        <FormError msg={err} />
        <Actions onCancel={onClose} del={payslip ? () => onDelete(payslip) : undefined} />
      </form>
    </Shell>
  )
}

/* ---------- configuración de jornada ---------- */
const TURNOS_BASE: Turno[] = [
  { n: "Mañana", ini: "06:00", fin: "14:00", pausa: 0 },
  { n: "Tarde", ini: "14:00", fin: "22:00", pausa: 0 },
  { n: "Noche", ini: "22:00", fin: "06:00", pausa: 0 },
]

export function WorkCfgDialog({
  open,
  cfg,
  onClose,
  onSave,
  onSchedule,
}: {
  open: boolean
  cfg: WorkCfg
  onClose: () => void
  onSave: (c: WorkCfg) => void
  /** Guarda lo escrito y abre el cuadrante rotativo. */
  onSchedule: (c: WorkCfg) => void
}) {
  const num = (x: number) => String(x).replace(".", ",")
  const [modo, setModo] = React.useState<WorkModo>(modoOf(cfg))
  const [regla, setRegla] = React.useState<ExtraRegla>(cfg.extraRegla ?? "turno")
  const [turnos, setTurnos] = React.useState<(Turno & { p: string })[]>(() =>
    (cfg.turnos || []).map((t) => ({ ...t, p: String(t.pausa) }))
  )
  const [hd, setHd] = React.useState(num(cfg.horasDia))
  const [hs, setHs] = React.useState(num(cfg.horasSemana))
  const [ph, setPh] = React.useState(cfg.precioHora ? fmtPlain(cfg.precioHora) : "")
  const [pe, setPe] = React.useState(cfg.precioExtra ? fmtPlain(cfg.precioExtra) : "")
  const [ini, setIni] = React.useState(cfg.ini)
  const [fin, setFin] = React.useState(cfg.fin)
  const [pausa, setPausa] = React.useState(String(cfg.pausa))
  const [err, setErr] = React.useState("")
  const rot = modo === "turnos"
  const cuadrante = scheduleOn(cfg)

  const addTurno = (t?: Turno) =>
    setTurnos((l) =>
      l.length >= 6 ? l : [...l, { ...(t || { n: `Turno ${l.length + 1}`, ini: "08:00", fin: "16:00", pausa: 0 }), p: String(t?.pausa ?? 0) }]
    )
  const setT = (i: number, patch: Partial<Turno & { p: string }>) => setTurnos((l) => l.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  /** Valida y devuelve la configuración; null si hay un error (ya mostrado). */
  function build(): WorkCfg | null {
    const fail = (m: string) => {
      setErr(m)
      return null
    }
    const dia = (parseMoney(hd) ?? 0) / 100,
      sem = (parseMoney(hs) ?? 0) / 100
    if (!rot && !(dia > 0 && dia <= 24)) return fail("La jornada diaria debe estar entre 0 y 24 horas.")
    if (!(sem > 0 && sem <= 168)) return fail("Las horas a la semana deben estar entre 0 y 168.")
    const pH = ph.trim() ? parsePos(ph) : 0
    const pE = pe.trim() ? parsePos(pe) : 0
    if (pH == null || pE == null) return fail("Revisa los precios por hora.")
    if (!rot && (toMin(ini) == null || toMin(fin) == null)) return fail("Revisa tu horario habitual.")
    const list: Turno[] = []
    for (const [i, t] of turnos.entries()) {
      const tt: Turno = { n: t.n.trim() || `Turno ${i + 1}`, ini: t.ini, fin: t.fin, pausa: Math.max(0, Math.round(Number(t.p) || 0)) }
      if (toMin(tt.ini) == null || toMin(tt.fin) == null) return fail(`Revisa las horas del turno «${tt.n}».`)
      if (planMinutes(tt) <= 0) return fail(`El turno «${tt.n}» no suma horas.`)
      list.push(tt)
    }
    const out: WorkCfg = {
      ...cfg,
      modo,
      horasDia: rot ? cfg.horasDia : dia,
      horasSemana: sem,
      precioHora: pH,
      precioExtra: pE,
      ini: rot ? cfg.ini : ini,
      fin: rot ? cfg.fin : fin,
      pausa: rot ? cfg.pausa : Math.max(0, Math.round(Number(pausa) || 0)),
    }
    if (rot) out.extraRegla = regla
    else delete out.extraRegla
    if (list.length) out.turnos = list
    else delete out.turnos
    return out
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const c = build()
    if (c) onSave(c)
  }

  const hint =
    regla === "turno"
      ? "Extra = lo que alargas tu turno y los días que trabajas sin tocarte."
      : `Extra = lo que pase de ${hs || "tus"} h en la semana, trabajes el día que trabajes.`

  return (
    <Shell open={open} onClose={onClose} title="Tu jornada" description="Con esto calculo tus horas y tus extras.">
      <form onSubmit={submit} noValidate className="grid gap-4">
        <div role="group" aria-label="Cómo trabajas" className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
          {(
            [
              ["fijo", "Horario fijo"],
              ["turnos", "Turnos rotativos"],
            ] as [WorkModo, string][]
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              aria-pressed={modo === v}
              onClick={() => setModo(v)}
              className={cn(
                "h-10 rounded-xl text-sm font-semibold text-muted-foreground transition-all",
                modo === v && "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {rot ? (
          <>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Tus turnos</span>
              {turnos.map((t, i) => {
                const ok = toMin(t.ini) != null && toMin(t.fin) != null
                return (
                  <div key={i} className="grid gap-2 rounded-2xl p-2.5 ring-1 ring-foreground/10">
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label="Nombre del turno"
                        value={t.n}
                        maxLength={20}
                        onChange={(e) => setT(i, { n: e.target.value })}
                        className="h-9 font-medium"
                      />
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold tabular-nums">
                        {ok ? fmtMin(planMinutes({ ini: t.ini, fin: t.fin, pausa: Number(t.p) || 0 })) : "—"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Quitar ${t.n}`}
                        onClick={() => setTurnos((l) => l.filter((_, j) => j !== i))}
                      >
                        <XIcon />
                      </Button>
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_4.25rem] gap-1.5">
                      <Input aria-label="Entrada" className="px-2" type="time" value={t.ini} onChange={(e) => setT(i, { ini: e.target.value })} />
                      <Input aria-label="Salida" className="px-2" type="time" value={t.fin} onChange={(e) => setT(i, { fin: e.target.value })} />
                      <Input
                        aria-label="Pausa en minutos"
                        inputMode="numeric"
                        placeholder="pausa"
                        value={t.p === "0" ? "" : t.p}
                        onChange={(e) => setT(i, { p: e.target.value })}
                      />
                    </div>
                  </div>
                )
              })}
              {turnos.length < 6 ? (
                <div className="flex flex-wrap gap-1.5">
                  {TURNOS_BASE.filter((b) => !turnos.some((t) => t.n === b.n)).map((b) => (
                    <button
                      key={b.n}
                      type="button"
                      onClick={() => addTurno(b)}
                      className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-foreground/15 hover:bg-muted"
                    >
                      <PlusIcon className="size-3.5" /> {b.n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => addTurno()}
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground ring-1 ring-foreground/15 hover:bg-muted"
                  >
                    <PlusIcon className="size-3.5" /> Otro
                  </button>
                </div>
              ) : null}
            </div>

            <Field label="Horas de contrato a la semana" htmlFor="wc-hs">
              <Input id="wc-hs" inputMode="decimal" value={hs} onChange={(e) => setHs(e.target.value)} />
            </Field>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Hago horas extra cuando…</span>
              <Segmented
                label="Regla de horas extra"
                value={regla}
                onChange={setRegla}
                options={[
                  { v: "turno", l: "Alargo mi turno" },
                  { v: "semana", l: "Paso de mis horas semanales" },
                ]}
              />
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                const c = build()
                if (c) onSchedule(c)
              }}
              className="flex items-center gap-3 rounded-2xl bg-muted/70 p-3 text-left hover:bg-muted"
            >
              <CalendarRangeIcon className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Cuadrante rotativo</span>
                <span className="block text-xs text-muted-foreground">
                  {cuadrante
                    ? `Se repite cada ${cfg.schedule!.weeks.length} ${cfg.schedule!.weeks.length === 1 ? "semana" : "semanas"}`
                    : "Dime qué días te tocan y ficho yo"}
                </span>
              </span>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Horas al día" htmlFor="wc-hd">
                <Input id="wc-hd" inputMode="decimal" value={hd} onChange={(e) => setHd(e.target.value)} />
              </Field>
              <Field label="Horas a la semana" htmlFor="wc-hs">
                <Input id="wc-hs" inputMode="decimal" value={hs} onChange={(e) => setHs(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <Field label="Entrada" htmlFor="wc-i">
                <Input id="wc-i" type="time" value={ini} onChange={(e) => setIni(e.target.value)} />
              </Field>
              <Field label="Salida" htmlFor="wc-f">
                <Input id="wc-f" type="time" value={fin} onChange={(e) => setFin(e.target.value)} />
              </Field>
              <Field label="Pausa (min)" htmlFor="wc-p">
                <Input id="wc-p" inputMode="numeric" value={pausa} onChange={(e) => setPausa(e.target.value)} />
              </Field>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Field label={`${sim()} por hora (bruto)`} htmlFor="wc-ph">
            <Input id="wc-ph" inputMode="decimal" placeholder="opcional" value={ph} onChange={(e) => setPh(e.target.value)} />
          </Field>
          <Field label={`${sim()} por hora extra`} htmlFor="wc-pe">
            <Input id="wc-pe" inputMode="decimal" placeholder="opcional" value={pe} onChange={(e) => setPe(e.target.value)} />
          </Field>
        </div>
        <p className="-mt-1 text-xs text-muted-foreground">Opcional: para estimar cuánto deberías cobrar por tus extras.</p>
        <FormError msg={err} />
        <Actions onCancel={onClose} />
      </form>
    </Shell>
  )
}
