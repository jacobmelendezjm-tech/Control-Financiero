/* Cálculos de jornadas, horas extra y nóminas. Minutos y céntimos siempre enteros. */
import { daysIn, pad, type FinanceData, type Payslip, type Shift, type ShiftKind, type WorkCfg } from "@/lib/finance"

export const KIND_LABEL: Record<ShiftKind, string> = {
  trabajo: "Trabajo",
  vacaciones: "Vacaciones",
  festivo: "Festivo",
  baja: "Baja",
  libre: "Libre",
}

export const toMin = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "")
  return m ? +m[1] * 60 + +m[2] : null
}
export const fmtMin = (min: number) => {
  const sign = min < 0 ? "−" : ""
  const a = Math.abs(Math.round(min))
  const h = Math.floor(a / 60),
    m = a % 60
  return `${sign}${h} h${m ? ` ${pad(m)} min` : ""}`
}
/** 7,5 h → «7,5 h» compacto para gráficos. */
export const fmtH = (min: number) =>
  `${(min / 60).toLocaleString("es-ES", { maximumFractionDigits: 1 })} h`

export function shiftMinutes(s: Shift) {
  if (s.kind !== "trabajo") return 0
  const a = toMin(s.ini),
    b = toMin(s.fin)
  if (a == null || b == null) return 0
  const span = b >= a ? b - a : b + 1440 - a // turnos que pasan de medianoche
  return Math.max(0, span - (s.pausa || 0))
}

export interface DayTotal {
  d: string
  min: number
  extra: number
  kinds: ShiftKind[]
  shifts: Shift[]
}

export function dayTotals(shifts: Shift[], cfg: WorkCfg) {
  const map: Record<string, DayTotal> = {}
  for (const s of shifts) {
    const t = (map[s.d] ||= { d: s.d, min: 0, extra: 0, kinds: [], shifts: [] })
    t.min += shiftMinutes(s)
    t.shifts.push(s)
    if (!t.kinds.includes(s.kind)) t.kinds.push(s.kind)
  }
  for (const t of Object.values(map)) {
    const manual = t.shifts.filter((s) => s.ex != null)
    t.extra = manual.length
      ? manual.reduce((a, s) => a + (s.ex || 0), 0)
      : Math.max(0, t.min - Math.round(cfg.horasDia * 60))
    t.shifts.sort((a, b) => (a.ini || "").localeCompare(b.ini || ""))
  }
  return map
}

const dateOf = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number)
  return new Date(y, m - 1, dd)
}
const iso = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
/** Lunes de la semana de una fecha. */
export function weekStart(d: string) {
  const dt = dateOf(d)
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7))
  return iso(dt)
}
export function addDays(d: string, k: number) {
  const dt = dateOf(d)
  dt.setDate(dt.getDate() + k)
  return iso(dt)
}

export interface PeriodSummary {
  days: number
  min: number
  extra: number
  normal: number
  vacaciones: number
  festivos: number
  bajas: number
  avg: number
  pay: number
  extraPay: number
}

export function summarize(days: DayTotal[], cfg: WorkCfg): PeriodSummary {
  let min = 0,
    extra = 0,
    worked = 0,
    vac = 0,
    fest = 0,
    baja = 0
  for (const t of days) {
    min += t.min
    extra += t.extra
    if (t.min > 0) worked++
    if (t.kinds.includes("vacaciones")) vac++
    if (t.kinds.includes("festivo")) fest++
    if (t.kinds.includes("baja")) baja++
  }
  const normal = Math.max(0, min - extra)
  const extraPay = Math.round((extra / 60) * cfg.precioExtra)
  const pay = Math.round((normal / 60) * cfg.precioHora) + extraPay
  return { days: worked, min, extra, normal, vacaciones: vac, festivos: fest, bajas: baja, avg: worked ? min / worked : 0, pay, extraPay }
}

export function monthDays(map: Record<string, DayTotal>, month: string) {
  return Object.values(map).filter((t) => t.d.startsWith(month))
}

/** Semanas (lunes a domingo) que tocan el mes, con sus totales completos. */
export function monthWeeks(map: Record<string, DayTotal>, month: string, cfg: WorkCfg) {
  const first = `${month}-01`,
    last = `${month}-${pad(daysIn(month))}`
  const out: { start: string; end: string; days: DayTotal[]; sum: PeriodSummary; target: number }[] = []
  for (let ws = weekStart(first); ws <= last; ws = addDays(ws, 7)) {
    const end = addDays(ws, 6)
    const days: DayTotal[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i)
      if (map[d]) days.push(map[d])
    }
    out.push({ start: ws, end, days, sum: summarize(days, cfg), target: Math.round(cfg.horasSemana * 60) })
  }
  return out
}

/** Rejilla de calendario: semanas de lunes a domingo, null fuera del mes. */
export function calendarGrid(month: string) {
  const [y, m] = month.split("-").map(Number)
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= daysIn(month); d++) cells.push(`${month}-${pad(d)}`)
  while (cells.length % 7) cells.push(null)
  return cells
}

/* ---------- nóminas ---------- */
export const SS_RATE = 0.0648 // cuota obrera aprox.: contingencias comunes, desempleo, FP y MEI

export function payslipYear(payslips: Payslip[], year: string) {
  const list = payslips.filter((p) => p.m.startsWith(year))
  const sum = (k: keyof Payslip) => list.reduce((a, p) => a + (Number(p[k]) || 0), 0)
  const bruto = sum("bruto"),
    irpf = sum("irpf"),
    neto = sum("neto")
  return {
    list,
    bruto,
    irpf,
    ss: sum("ss"),
    neto,
    extras: sum("extras"),
    irpfRate: bruto ? irpf / bruto : null,
    avgNeto: list.length ? neto / list.length : 0,
    minNeto: list.length ? Math.min(...list.map((p) => p.neto)) : 0,
    maxNeto: list.length ? Math.max(...list.map((p) => p.neto)) : 0,
  }
}

/** Neto que ganas por hora: última nómina ÷ horas de ese mes; si no, el sueldo del perfil. */
export function netPerHour(data: FinanceData) {
  const map = dayTotals(data.work.shifts, data.work.cfg)
  const last = [...data.payslips].sort((a, b) => b.m.localeCompare(a.m))[0]
  if (last) {
    const h = summarize(monthDays(map, last.m), data.work.cfg).min / 60
    if (h > 0) return last.neto / h
  }
  const neto = data.settings.perfil?.neto
  if (neto) return neto / (data.work.cfg.horasSemana * 4.33 || 173)
  return 0
}
