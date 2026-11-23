/* Lógica pura de Mis Finanzas. Los importes se guardan en céntimos (enteros). */

export type TxType = "g" | "i"
export type Group = "nec" | "des"

export interface Category {
  id: string
  n: string
  t: TxType
  g?: Group
}
export interface Tx {
  id: string
  k: number
  d: string // AAAA-MM-DD
  t: TxType
  c: number
  cat: string
  n: string
  rec?: string
  /** Gasto hormiga marcado a mano (true/false). Si falta, se decide por importe. */
  h?: boolean
  /** Movimiento creado desde una nómina. */
  ps?: string
}
export interface Recurring {
  id: string
  n: string
  t: TxType
  c: number
  cat: string
  dia: number
  on: boolean
}
export interface Goal {
  id: string
  n: string
  obj: number
  ah: number
  fecha?: string // AAAA-MM
}
/** Aportación (o retirada, si es negativa) a una meta de ahorro. */
export interface Aporte {
  id: string
  goal: string
  d: string // AAAA-MM-DD
  c: number // céntimos, con signo
}
export interface Settings {
  cats: Category[]
  budgets: Record<string, number>
  saldoInicial: number
  recs: Recurring[]
  started: boolean
  /** Importe máximo (céntimos) para que un gasto cuente como hormiga. */
  hormigaMax: number
  nombre: string
  perfil: Perfil
  /** Moneda en la que se apuntan y muestran todos los importes. */
  moneda: Moneda
}

/* ---------- moneda ---------- */
export type Moneda = "EUR" | "ARS" | "USD"
export const MONEDAS: Record<Moneda, { nombre: string; corto: string; zona: string; sim: string; locale: string; hormiga: number }> = {
  EUR: { nombre: "Euro", corto: "Euro", zona: "España y zona euro", sim: "€", locale: "es-ES", hormiga: 1000 },
  ARS: { nombre: "Peso argentino", corto: "Peso arg.", zona: "Argentina", sim: "$", locale: "es-AR", hormiga: 1000000 },
  // Formato con coma decimal (como el resto de la app) y «US$» para no confundirlo con el peso.
  USD: { nombre: "Dólar estadounidense", corto: "Dólar", zona: "EE. UU. y ahorro en dólares", sim: "US$", locale: "es-AR", hormiga: 1000 },
}
export const isMoneda = (x: unknown): x is Moneda => typeof x === "string" && x in MONEDAS

/* ---------- perfil (formulario de bienvenida) ---------- */
export type Cobro = "fija" | "horas" | "autonomo" | "no"
export type Objetivo = "ahorrar" | "emergencia" | "controlar" | "deudas" | "saber"
export interface Perfil {
  done?: boolean
  cobro?: Cobro
  neto?: number // céntimos al mes, aproximado
  diaCobro?: number
  objetivo?: Objetivo
  ahorroMes?: number // céntimos
  /** Lo que más le interesa: ordena los accesos y las tarjetas de Inicio. */
  intereses?: Interes[]
}
export type Interes = "gastos" | "ahorro" | "horas" | "nominas" | "hormiga" | "presupuesto"
export const INTERESES: Interes[] = ["gastos", "ahorro", "horas", "nominas", "hormiga", "presupuesto"]
/** Intereses válidos, sin repetir y en el orden en que los eligió. */
export const cleanIntereses = (x: unknown): Interes[] =>
  Array.isArray(x) ? [...new Set(x.filter((i): i is Interes => INTERESES.includes(i)))] : []

/* ---------- trabajo ---------- */
export type ShiftKind = "trabajo" | "vacaciones" | "festivo" | "baja" | "libre"
export interface Shift {
  id: string
  d: string // AAAA-MM-DD
  kind: ShiftKind
  ini: string // HH:MM
  fin: string // HH:MM
  pausa: number // minutos
  /** Minutos extra a mano; si falta se calculan sobre la jornada diaria. */
  ex?: number | null
  n?: string
  /** Turno cubriendo a otra persona. */
  cubre?: boolean
}
export interface WorkCfg {
  horasDia: number
  horasSemana: number
  /** Precio bruto de la hora normal y de la extra, en céntimos (0 = sin calcular). */
  precioHora: number
  precioExtra: number
  ini: string
  fin: string
  pausa: number
  /** Horario por turnos que se repite en un ciclo de semanas. */
  schedule?: Schedule
  /**
   * Semanas planificadas una a una (horarios que cambian cada semana sin patrón).
   * Clave: lunes de la semana (AAAA-MM-DD). Tiene prioridad sobre `schedule`.
   */
  weekPlans?: Record<string, (DayPlan | null)[]>
  /** Cómo trabajas: horario fijo o turnos rotativos. Si falta, se deduce de si hay cuadrante. */
  modo?: WorkModo
  /** Tus turnos tipo (Mañana, Tarde, Noche…) para elegirlos con un toque. */
  turnos?: Turno[]
  /**
   * Qué cuenta como extra con turnos: «turno» = lo que pasa del turno previsto ese día
   * (y el día entero si no te tocaba); «semana» = lo que pasa de tus horas de contrato semanales.
   */
  extraRegla?: ExtraRegla
}
export type WorkModo = "fijo" | "turnos"
export type ExtraRegla = "turno" | "semana"
export interface Turno {
  n: string
  ini: string
  fin: string
  pausa: number
}
export interface DayPlan {
  ini: string
  fin: string
  pausa: number
  /** Turno cubriendo a otra persona. */
  cubre?: boolean
}
export interface Schedule {
  on: boolean
  /** Lunes de la semana 1 del ciclo (AAAA-MM-DD). */
  anchor: string
  /** Cada semana: 7 días de lunes a domingo; null = libre. */
  weeks: (DayPlan | null)[][]
}
export interface WorkData {
  cfg: WorkCfg
  shifts: Shift[]
  /** Notas del calendario por día (AAAA-MM-DD → texto). */
  notes?: Record<string, string>
}
export interface Payslip {
  id: string
  m: string // AAAA-MM al que corresponde
  dPago: string // AAAA-MM-DD
  bruto: number
  irpf: number // céntimos retenidos
  ss: number // seguridad social
  otros: number
  neto: number
  extras: number // importe de horas extra incluido en el bruto
  horasExtra: number // minutos pagados
  txId?: string
  n?: string
}

export interface FinanceData {
  settings: Settings
  goals: Goal[]
  months: Record<string, Tx[]>
  hasSettings: boolean
  work: WorkData
  payslips: Payslip[]
  aportes: Aporte[]
}

/* ---------- utilidades ---------- */
export const pad = (n: number) => String(n).padStart(2, "0")
export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5)
export const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o))

/*
 * Formato de los importes según la moneda elegida. Toda la app usa eur()/eur0()…, que
 * formatean con la moneda activa; la cambia setMoneda() al cargar o cambiar los ajustes.
 */
let MON: Moneda = "EUR"
const formatters = (m: Moneda) => ({
  nf: new Intl.NumberFormat(MONEDAS[m].locale, { style: "currency", currency: m }),
  nf0: new Intl.NumberFormat(MONEDAS[m].locale, { style: "currency", currency: m, maximumFractionDigits: 0, minimumFractionDigits: 0 }),
})
let NF = formatters("EUR").nf
let NF0 = formatters("EUR").nf0
export function setMoneda(m: Moneda | undefined) {
  const next = isMoneda(m) ? m : "EUR"
  if (next === MON) return
  MON = next
  ;({ nf: NF, nf0: NF0 } = formatters(next))
}
/** Moneda activa y su símbolo (€ o $), para etiquetas como «Importe (€)». */
export const moneda = () => MON
export const sim = () => MONEDAS[MON].sim
/** Nombres de las retenciones de la nómina según el país. */
export const retenciones = () =>
  MON === "ARS"
    ? { ret: "Ganancias", retenido: "Ganancias retenidas", retLarga: "Impuesto a las Ganancias", ss: "Aportes", ssLarga: "Aportes (jubilación, obra social y PAMI)" }
    : MON === "USD"
      ? { ret: "Impuestos", retenido: "Impuestos retenidos", retLarga: "Impuestos retenidos", ss: "Aportes", ssLarga: "Aportes sociales" }
      : { ret: "IRPF", retenido: "IRPF retenido", retLarga: "Retención IRPF", ss: "Seg. Social", ssLarga: "Seguridad Social" }
const PF = new Intl.NumberFormat("es-ES", { style: "percent", maximumFractionDigits: 0 })
export const MINUS = "−"
export const eur = (c: number) => NF.format(Math.abs(c || 0) / 100)
export const eurM = (c: number) => (c < 0 ? MINUS : "") + eur(c)
export const eurS = (c: number) => (c > 0 ? "+" : c < 0 ? MINUS : "") + eur(c)
export const eur0 = (c: number) => NF0.format(Math.round((c || 0) / 100))
export const pct = (x: number | null | undefined) =>
  x == null || !isFinite(x) ? "—" : PF.format(x)
export const fmtPlain = (c: number) =>
  (c / 100).toLocaleString("es-ES", {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

export function parseMoney(input: unknown): number | null {
  if (input == null) return null
  let s = String(input).trim().replace(/US\$|[\s€$]/gi, "").replace(/^\+/, "")
  let neg = false
  if (/^[-−]/.test(s)) {
    neg = true
    s = s.slice(1)
  }
  if (!s) return null
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".")
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "")
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const v = Math.round(parseFloat(s) * 100)
  return neg ? -v : v
}
export const parsePos = (s: unknown) => {
  const v = parseMoney(s)
  return v != null && v > 0 ? v : null
}

/* ---------- fechas ---------- */
export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const CUR = () => todayStr().slice(0, 7)
export const ym = (d: string) => String(d).slice(0, 7)
export function addMonths(m: string, k: number) {
  let [y, mo] = m.split("-").map(Number)
  mo += k
  y += Math.floor((mo - 1) / 12)
  mo = ((((mo - 1) % 12) + 12) % 12) + 1
  return `${y}-${pad(mo)}`
}
export function daysIn(m: string) {
  const [y, mo] = m.split("-").map(Number)
  return new Date(y, mo, 0).getDate()
}
export function monthsBetween(a: string, b: string) {
  const [y1, m1] = a.split("-").map(Number)
  const [y2, m2] = b.split("-").map(Number)
  return (y2 - y1) * 12 + (m2 - m1)
}
export function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
}
export function monthShort(m: string) {
  const [y, mo] = m.split("-").map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString("es-ES", { month: "short" }).replace(".", "")
}
export function dayLabel(d: string) {
  const [y, m, dd] = d.split("-").map(Number)
  return new Date(y, m - 1, dd)
    .toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })
    .replace(".", "")
}
export function fmtDate(d: string) {
  const [y, m, dd] = d.split("-")
  return `${dd}/${m}/${y}`
}

/* ---------- datos por defecto ---------- */
export const DEFAULT_CATS: Category[] = [
  { id: "casa", n: "Casa y alquiler", t: "g", g: "nec" },
  { id: "super", n: "Supermercado", t: "g", g: "nec" },
  { id: "transporte", n: "Transporte", t: "g", g: "nec" },
  { id: "facturas", n: "Móvil e internet", t: "g", g: "nec" },
  { id: "estudios", n: "Estudios", t: "g", g: "nec" },
  { id: "salud", n: "Salud", t: "g", g: "nec" },
  { id: "comer", n: "Comer fuera y cafés", t: "g", g: "des" },
  { id: "ocio", n: "Ocio y salidas", t: "g", g: "des" },
  { id: "ropa", n: "Ropa", t: "g", g: "des" },
  { id: "subs", n: "Suscripciones", t: "g", g: "des" },
  { id: "regalos", n: "Regalos", t: "g", g: "des" },
  { id: "otros-g", n: "Otros gastos", t: "g", g: "des" },
  { id: "nomina", n: "Nómina", t: "i" },
  { id: "extras", n: "Extras y propinas", t: "i" },
  { id: "ayudas", n: "Becas y ayudas", t: "i" },
  { id: "otros-i", n: "Otros ingresos", t: "i" },
]
export const FIXED_CATS = ["otros-g", "otros-i"]

export const defaultSettings = (): Settings => ({
  cats: clone(DEFAULT_CATS),
  budgets: {},
  saldoInicial: 0,
  recs: [],
  started: false,
  hormigaMax: 1000,
  nombre: "",
  perfil: {},
  moneda: "EUR",
})
export const defaultWork = (): WorkData => ({
  cfg: { horasDia: 8, horasSemana: 40, precioHora: 0, precioExtra: 0, ini: "09:00", fin: "17:30", pausa: 30 },
  shifts: [],
})
const HHMM = /^\d{2}:\d{2}$/
/** Lista de turnos tipo limpia (como mucho 6, con nombre y horas válidas). */
export function normalizeTurnos(x: unknown): Turno[] {
  if (!Array.isArray(x)) return []
  return x
    .filter((t) => t && typeof t === "object" && HHMM.test(t.ini) && HHMM.test(t.fin))
    .slice(0, 6)
    .map((t) => ({ n: String(t.n || "Turno").slice(0, 20), ini: t.ini, fin: t.fin, pausa: Math.max(0, Math.min(600, Math.round(Number(t.pausa) || 0))) }))
}
const SHIFT_KINDS: ShiftKind[] = ["trabajo", "vacaciones", "festivo", "baja", "libre"]
export function normalizeWork(w: unknown): WorkData {
  const d = defaultWork()
  if (!w || typeof w !== "object") return d
  const o = w as Partial<WorkData>
  const cfg = Object.assign(d.cfg, o.cfg || {})
  cfg.horasDia = Number(cfg.horasDia) || 8
  cfg.horasSemana = Number(cfg.horasSemana) || 40
  cfg.precioHora = Number(cfg.precioHora) || 0
  cfg.precioExtra = Number(cfg.precioExtra) || 0
  cfg.pausa = Number(cfg.pausa) || 0
  if (cfg.modo !== "fijo" && cfg.modo !== "turnos") delete cfg.modo
  if (cfg.extraRegla !== "turno" && cfg.extraRegla !== "semana") delete cfg.extraRegla
  cfg.turnos = normalizeTurnos(cfg.turnos)
  if (!cfg.turnos.length) delete cfg.turnos
  const sch = cfg.schedule
  if (
    !sch ||
    typeof sch !== "object" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(sch.anchor) ||
    !Array.isArray(sch.weeks) ||
    !sch.weeks.length ||
    !sch.weeks.every((w) => Array.isArray(w) && w.length === 7)
  )
    delete cfg.schedule
  if (cfg.weekPlans && typeof cfg.weekPlans === "object") {
    for (const [k, w] of Object.entries(cfg.weekPlans))
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(w) || w.length !== 7) delete cfg.weekPlans[k]
    if (!Object.keys(cfg.weekPlans).length) delete cfg.weekPlans
  } else delete cfg.weekPlans
  const shifts = Array.isArray(o.shifts)
    ? o.shifts.filter((x) => x && /^\d{4}-\d{2}-\d{2}$/.test(x.d) && SHIFT_KINDS.includes(x.kind))
    : []
  const notes: Record<string, string> = {}
  for (const [k, v] of Object.entries(o.notes || {}))
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === "string" && v.trim()) notes[k] = v.slice(0, 200)
  return { cfg, shifts: clone(shifts), ...(Object.keys(notes).length ? { notes } : {}) }
}
export function normalizeSettings(s: unknown): Settings {
  const d = defaultSettings()
  if (!s || typeof s !== "object") return d
  const out = Object.assign(d, s) as Settings
  if (!Array.isArray(out.cats) || !out.cats.length) out.cats = clone(DEFAULT_CATS)
  for (const id of FIXED_CATS)
    if (!out.cats.some((c) => c.id === id))
      out.cats.push(clone(DEFAULT_CATS.find((c) => c.id === id)!))
  if (!out.budgets || typeof out.budgets !== "object") out.budgets = {}
  if (!Array.isArray(out.recs)) out.recs = []
  out.saldoInicial = Number(out.saldoInicial) || 0
  out.moneda = isMoneda(out.moneda) ? out.moneda : "EUR"
  out.hormigaMax = Number(out.hormigaMax) || MONEDAS[out.moneda].hormiga
  out.nombre = typeof out.nombre === "string" ? out.nombre.slice(0, 30) : ""
  out.perfil = out.perfil && typeof out.perfil === "object" ? out.perfil : {}
  if (out.perfil.intereses !== undefined) {
    const it = cleanIntereses(out.perfil.intereses)
    if (it.length) out.perfil.intereses = it
    else delete out.perfil.intereses
  }
  return out
}
export const byDate = (a: Tx, b: Tx) => b.d.localeCompare(a.d) || (b.k || 0) - (a.k || 0)

export function loadAll(o: Partial<FinanceData> & { settings?: unknown }): FinanceData {
  const months: Record<string, Tx[]> = {}
  for (const [m, items] of Object.entries(o.months || {}))
    if (/^\d{4}-\d{2}$/.test(m) && Array.isArray(items) && items.length)
      months[m] = clone(items).sort(byDate)
  return {
    settings: normalizeSettings(o.settings ? clone(o.settings) : null),
    goals: Array.isArray(o.goals) ? clone(o.goals) : [],
    months,
    hasSettings: !!(o.hasSettings || o.settings),
    work: normalizeWork(o.work),
    payslips: Array.isArray(o.payslips) ? clone(o.payslips).filter((p) => p && /^\d{4}-\d{2}$/.test(p.m)) : [],
    aportes: Array.isArray(o.aportes) ? clone(o.aportes).filter((a) => a && a.goal && /^\d{4}-\d{2}-\d{2}$/.test(a.d) && a.c) : [],
  }
}
export const emptyData = (): FinanceData => ({
  settings: defaultSettings(),
  goals: [],
  months: {},
  hasSettings: false,
  work: defaultWork(),
  payslips: [],
  aportes: [],
})

/* ---------- gastos hormiga ---------- */
export function isHormiga(t: Tx, cm: Record<string, Category>, max: number) {
  if (t.t !== "g") return false
  if (typeof t.h === "boolean") return t.h
  return !t.rec && t.c <= max && cm[t.cat]?.g !== "nec"
}
export function hormigaStats(data: FinanceData, month: string) {
  const cm = catMap(data.settings.cats)
  const max = data.settings.hormigaMax
  const txs = (data.months[month] || []).filter((t) => isHormiga(t, cm, max))
  const total = txs.reduce((a, t) => a + t.c, 0)
  const cur = CUR()
  const elapsed = month === cur ? new Date().getDate() : month < cur ? daysIn(month) : 0
  const perDay = elapsed ? total / elapsed : 0
  const groups: Record<string, { name: string; c: number; n: number }> = {}
  for (const t of txs) {
    const name = t.n ? cap(t.n.trim()) : cm[t.cat]?.n || "Sin nota"
    const k = norm(name)
    groups[k] ||= { name, c: 0, n: 0 }
    groups[k].c += t.c
    groups[k].n++
  }
  const weekday = [0, 0, 0, 0, 0, 0, 0]
  for (const t of txs) {
    const [y, m, d] = t.d.split("-").map(Number)
    weekday[(new Date(y, m - 1, d).getDay() + 6) % 7] += t.c
  }
  const exp = monthStats(data.months[month] || []).exp
  return {
    txs,
    total,
    count: txs.length,
    perDay,
    year: Math.round(perDay * 365),
    share: exp ? total / exp : null,
    top: Object.values(groups).sort((a, b) => b.c - a.c),
    weekday,
  }
}

/* ---------- cálculos ---------- */
export const catMap = (cats: Category[]) => {
  const o: Record<string, Category> = {}
  for (const c of cats) o[c.id] = c
  return o
}
export function monthStats(txs: Tx[]) {
  let inc = 0,
    exp = 0
  for (const t of txs) {
    if (t.t === "i") inc += t.c
    else exp += t.c
  }
  return { inc, exp, bal: inc - exp, rate: inc > 0 ? (inc - exp) / inc : null }
}
export function balanceUpTo(months: Record<string, Tx[]>, saldoInicial: number, m: string) {
  let b = saldoInicial || 0
  for (const k of Object.keys(months))
    if (k <= m) for (const t of months[k]) b += t.t === "i" ? t.c : -t.c
  return b
}
export function byCategory(txs: Tx[], type: TxType) {
  const acc: Record<string, number> = {}
  for (const t of txs) if (t.t === type) acc[t.cat] = (acc[t.cat] || 0) + t.c
  return Object.entries(acc)
    .map(([cat, c]) => ({ cat, c }))
    .sort((a, b) => b.c - a.c)
}
export function rule503020(txs: Tx[], cats: Category[]) {
  const cm = catMap(cats)
  let nec = 0,
    des = 0
  const st = monthStats(txs)
  for (const t of txs)
    if (t.t === "g") {
      if (cm[t.cat]?.g === "nec") nec += t.c
      else des += t.c
    }
  return { inc: st.inc, nec, des, aho: st.inc - st.exp }
}
export const pendingRecs = (recs: Recurring[], txs: Tx[]) =>
  (recs || []).filter((r) => r.on !== false && !txs.some((t) => t.rec === r.id))

export type BudgetState = "ok" | "warn" | "bad" | "none"
export function budgetState(spent: number, limit: number): BudgetState {
  if (!limit) return "none"
  const p = spent / limit
  return p > 1 ? "bad" : p >= 0.8 ? "warn" : "ok"
}
export function budgetRows(txs: Tx[], settings: Settings) {
  const spent: Record<string, number> = {}
  for (const t of txs) if (t.t === "g") spent[t.cat] = (spent[t.cat] || 0) + t.c
  return settings.cats
    .filter((c) => c.t === "g")
    .map((c) => {
      const lim = settings.budgets[c.id] || 0,
        s = spent[c.id] || 0
      return { cat: c, spent: s, limit: lim, pct: lim ? s / lim : null, state: budgetState(s, lim) }
    })
    .sort(
      (a, b) =>
        (b.limit ? 1 : 0) - (a.limit ? 1 : 0) || (b.pct || 0) - (a.pct || 0) || b.spent - a.spent
    )
}
export function projection(txs: Tx[], pend: Recurring[], m: string, day: number) {
  const dim = daysIn(m)
  let fixed = 0,
    variable = 0
  for (const t of txs)
    if (t.t === "g") {
      if (t.rec) fixed += t.c
      else variable += t.c
    }
  const pendFixed = pend.filter((r) => r.t === "g").reduce((a, r) => a + r.c, 0)
  const avg = variable / day
  return { avg, total: Math.round(fixed + pendFixed + avg * dim) }
}
export function niceScale(max: number, n: number) {
  if (max <= 0) return { top: 100, step: 50 }
  const raw = max / n,
    mag = Math.pow(10, Math.floor(Math.log10(raw))),
    r = raw / mag
  const k = r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10
  const step = k * mag
  return { top: step * Math.ceil(max / step), step }
}

/* ---------- CSV (punto y coma y coma decimal: se abre bien en Excel en español) ---------- */
/** Texto que Excel interpretaría como fórmula (=, +, -, @…): se le antepone un apóstrofo. */
const noFormula = (s: string) => (/^[=+\-@\t\r]/.test(s) ? "'" + s : s)
function csvCell(v: unknown) {
  const s = String(v ?? "")
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
export function toCSV(months: Record<string, Tx[]>, cats: Category[]) {
  const cm = catMap(cats)
  const rows: string[][] = [["Fecha", "Tipo", "Categoría", "Importe", "Nota"]]
  const all = Object.values(months)
    .flat()
    .sort((a, b) => a.d.localeCompare(b.d) || (a.k || 0) - (b.k || 0))
  for (const t of all)
    rows.push([
      fmtDate(t.d),
      t.t === "i" ? "Ingreso" : "Gasto",
      noFormula(cm[t.cat]?.n || ""),
      (t.t === "i" ? "" : "-") + (t.c / 100).toFixed(2).replace(".", ","),
      noFormula(t.n || ""),
    ])
  return "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n")
}
export function parseCSV(input: string) {
  const text = String(input).replace(/^﻿/, "")
  const first = text.split(/\r?\n/)[0] || ""
  const sep = [";", "\t", ","]
    .map((s) => [s, first.split(s).length] as const)
    .sort((a, b) => b[1] - a[1])[0][0]
  const rows: string[][] = []
  let row: string[] = [],
    f = "",
    q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          f += '"'
          i++
        } else q = false
      } else f += ch
    } else if (ch === '"') q = true
    else if (ch === sep) {
      row.push(f)
      f = ""
    } else if (ch === "\n") {
      row.push(f)
      rows.push(row)
      row = []
      f = ""
    } else if (ch !== "\r") f += ch
  }
  if (f !== "" || row.length) {
    row.push(f)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}
function parseDateAny(input: string) {
  const s = String(input || "").trim()
  let m
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`
  if ((m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/))) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3]
    return `${y}-${pad(+m[2])}-${pad(+m[1])}`
  }
  return null
}
export function importCSVRows(rows: string[][], cats: Category[]) {
  if (rows.length < 2) return { txs: [] as Tx[], newCats: [] as Category[], skipped: rows.length }
  const h = rows[0].map(norm)
  const find = (keys: string[]) => h.findIndex((x) => keys.some((k) => x.startsWith(k)))
  const iF = find(["fecha", "date", "dia"]),
    iT = find(["tipo", "type"]),
    iC = find(["categ"]),
    iA = find(["importe", "cantidad", "amount", "monto", "valor"]),
    iN = find(["nota", "concepto", "descrip", "note", "detalle"])
  if (iF < 0 || iA < 0) return { error: "El archivo necesita al menos las columnas Fecha e Importe." }
  const all = cats.slice(),
    newCats: Category[] = [],
    txs: Tx[] = []
  let skipped = 0
  rows.slice(1).forEach((r, idx) => {
    const d = parseDateAny(r[iF])
    const raw = parseMoney(r[iA])
    if (!d || raw == null || raw === 0) {
      skipped++
      return
    }
    const tipo = iT >= 0 ? norm(r[iT]) : ""
    const t: TxType =
      tipo.startsWith("ingres") || tipo === "i"
        ? "i"
        : tipo.startsWith("gast") || tipo === "g"
          ? "g"
          : raw < 0
            ? "g"
            : "i"
    const cname = iC >= 0 ? String(r[iC] || "").trim() : ""
    let cat = t === "g" ? "otros-g" : "otros-i"
    if (cname) {
      let c = all.find((x) => x.t === t && norm(x.n) === norm(cname))
      if (!c) {
        c = { id: "c" + uid(), n: cname.slice(0, 40), t, ...(t === "g" ? { g: "des" as Group } : {}) }
        all.push(c)
        newCats.push(c)
      }
      cat = c.id
    }
    txs.push({
      id: uid() + idx,
      k: Date.now() + idx,
      d,
      t,
      c: Math.abs(raw),
      cat,
      n: iN >= 0 ? String(r[iN] || "").trim().slice(0, 80) : "",
    })
  })
  return { txs, newCats, skipped }
}
export const txKey = (t: Tx) => [t.d, t.t, t.c, t.cat, norm(t.n)].join("|")

/* ---------- ejemplo ---------- */
export function buildDemo(): FinanceData {
  const cur = CUR(),
    today = new Date().getDate(),
    months: Record<string, Tx[]> = {},
    s = defaultSettings()
  s.budgets = { super: 16000, comer: 6000, ocio: 5000, ropa: 4000, transporte: 4500 }
  s.saldoInicial = 62000
  s.started = true
  s.nombre = ""
  s.recs = [
    { id: "r-casa", n: "Aportación en casa", t: "g", c: 22000, cat: "casa", dia: 2, on: true },
    { id: "r-ciclo", n: "Cuota del ciclo", t: "g", c: 9000, cat: "estudios", dia: 5, on: true },
    { id: "r-movil", n: "Tarifa móvil", t: "g", c: 1500, cat: "facturas", dia: 8, on: true },
    { id: "r-spot", n: "Música en streaming", t: "g", c: 1199, cat: "subs", dia: 20, on: true },
    { id: "r-gym", n: "Gimnasio", t: "g", c: 2990, cat: "salud", dia: 3, on: true },
  ]
  const variable: [TxType, string, number[], string | string[], number[]][] = [
    ["g", "super", [2345, 1870, 3120, 2610], ["Mercadona", "Lidl", "Mercadona", "Lidl"], [4, 11, 18, 25]],
    ["g", "comer", [150, 220, 180, 350, 120, 260, 190, 450], ["Café", "Vending", "Café", "Bollería", "Chicles", "Café", "Vending", "Café con tostada"], [2, 6, 9, 12, 16, 19, 23, 27]],
    ["g", "comer", [1290, 1650], ["Menú del día", "Pizza con amigos"], [13, 26]],
    ["g", "transporte", [2000], "Abono transporte", [1]],
    ["g", "ocio", [850, 1800], ["Cine", "Concierto"], [10, 24]],
    ["g", "ropa", [2499], "Zapatillas", [17]],
    ["g", "subs", [299], "App de fotos", [14]],
  ]
  const fac = [1, 0.92, 1.12, 0.97, 1.06, 0.9]
  const netos = [91240, 84630, 88710, 92980, 86150, 89420]
  const payslips: Payslip[] = []
  for (let k = 5; k >= 0; k--) {
    const m = addMonths(cur, -k),
      last = k === 0 ? today : daysIn(m),
      items: Tx[] = []
    let seq = 0
    for (const r of s.recs)
      if (r.dia <= last)
        items.push({ id: `d${k}${r.id}`, k: ++seq, d: `${m}-${pad(r.dia)}`, t: r.t, c: r.c, cat: r.cat, n: r.n, rec: r.id })
    variable.forEach(([t, cat, amts, n, days], vi) => {
      if (cat === "ropa" && k % 2) return
      amts.forEach((a, j) => {
        const d = Math.min(days[j], daysIn(m))
        if (d <= last)
          items.push({
            id: `d${k}v${vi}${j}`,
            k: ++seq,
            d: `${m}-${pad(d)}`,
            t,
            c: Math.round(a * (t === "g" ? fac[k] : 1)),
            cat,
            n: Array.isArray(n) ? n[j] : n,
          })
      })
    })
    if (k === 2) items.push({ id: "d2reg", k: ++seq, d: `${m}-14`, t: "g", c: 2500, cat: "regalos", n: "Cumpleaños" })
    // Nómina del mes anterior, cobrada el día 1.
    if (k > 0 || today >= 1) {
      const neto = netos[k]
      const extras = [4750, 0, 2850, 6650, 1900, 3800][k]
      const bruto = Math.round((neto + 6500) / 0.9352)
      const ss = Math.round(bruto * 0.0648)
      const irpf = bruto - ss - neto
      const id = `ps${k}`
      const txId = `d${k}nom`
      payslips.push({ id, m: addMonths(m, -1), dPago: `${m}-01`, bruto, irpf, ss, otros: 0, neto, extras, horasExtra: Math.round(extras / 950) * 60, txId })
      items.push({ id: txId, k: ++seq, d: `${m}-01`, t: "i", c: neto, cat: "nomina", n: "Nómina", ps: id })
    }
    items.sort(byDate)
    months[m] = items
  }
  // Jornadas: lunes a viernes 9:00–17:30 con media hora de pausa; algunos días se alarga.
  const shifts: Shift[] = []
  for (let k = 2; k >= 0; k--) {
    const m = addMonths(cur, -k),
      last = k === 0 ? today : daysIn(m)
    const [y, mo] = m.split("-").map(Number)
    for (let d = 1; d <= last; d++) {
      const wd = new Date(y, mo - 1, d).getDay()
      if (wd === 0 || wd === 6) continue
      const date = `${m}-${pad(d)}`
      if (k === 1 && d >= 11 && d <= 15) {
        shifts.push({ id: `w${k}${d}`, d: date, kind: "vacaciones", ini: "", fin: "", pausa: 0 })
        continue
      }
      const long = (d * 7 + k) % 5 === 0
      const fin = long ? ((d + k) % 2 ? "19:30" : "19:00") : "17:30"
      shifts.push({ id: `w${k}${d}`, d: date, kind: "trabajo", ini: "09:00", fin, pausa: 30 })
    }
  }
  const goals: Goal[] = [
    { id: "g1", n: "Fondo de emergencia", obj: 150000, ah: 46000 },
    { id: "g2", n: "Portátil nuevo", obj: 90000, ah: 32000, fecha: addMonths(cur, 6) },
    { id: "g3", n: "Viaje de verano", obj: 60000, ah: 51500, fecha: addMonths(cur, 4) },
  ]
  const work = defaultWork()
  work.cfg.precioHora = 750
  work.cfg.precioExtra = 950
  work.shifts = shifts
  return { settings: s, goals, months, hasSettings: true, work, payslips: payslips.sort((a, b) => b.m.localeCompare(a.m)), aportes: [] }
}
