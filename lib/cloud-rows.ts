/*
 * Traducción entre los datos de la app (FinanceData) y las tablas de Supabase.
 * Cada tabla se representa como { clave: fila }, con las columnas en un orden fijo
 * para poder comparar filas con JSON.stringify.
 */
import {
  byDate,
  loadAll,
  type DayPlan,
  type FinanceData,
  type Shift,
  type Tx,
} from "@/lib/finance"

export type Row = Record<string, string | number | boolean | null>
export type Table =
  | "profiles"
  | "work_settings"
  | "categories"
  | "recurring"
  | "goals"
  | "goal_contributions"
  | "work_schedules"
  | "work_schedule_days"
  | "work_week_plans"
  | "work_day_notes"
  | "transactions"
  | "shifts"
  | "payslips"
export type RowSet = Record<Table, Record<string, Row>>

/** Orden de subida: primero lo que otras tablas referencian. */
export const TABLES: Table[] = [
  "profiles",
  "work_settings",
  "categories",
  "recurring",
  "goals",
  "goal_contributions",
  "work_schedules",
  "work_schedule_days",
  "work_week_plans",
  "work_day_notes",
  "transactions",
  "shifts",
  "payslips",
]
/** Tablas de una sola fila por usuario (la clave es siempre «me»). */
export const SINGLE: Table[] = ["profiles", "work_settings", "work_schedules"]
/** Tablas con borrado lógico (deleted_at). */
export const SOFT: Table[] = ["categories", "recurring", "goals", "goal_contributions", "transactions", "shifts", "payslips"]

const COLS: Record<Table, string[]> = {
  profiles: ["nombre", "saldo_inicial", "hormiga_max", "cobro", "neto_aprox", "dia_cobro", "objetivo", "ahorro_mes", "onboarding_done"],
  work_settings: ["horas_dia", "horas_semana", "precio_hora", "precio_extra", "hora_entrada", "hora_salida", "pausa_min"],
  categories: ["id", "nombre", "tipo", "grupo", "orden", "presupuesto"],
  recurring: ["id", "nombre", "tipo", "importe", "category_id", "dia", "activo"],
  goals: ["id", "nombre", "objetivo", "ahorrado", "fecha_limite"],
  goal_contributions: ["id", "goal_id", "fecha", "importe"],
  work_schedules: ["activo", "ancla", "semanas"],
  work_schedule_days: ["semana", "dia", "hora_entrada", "hora_salida", "pausa_min", "cubre"],
  work_week_plans: ["lunes", "dia", "hora_entrada", "hora_salida", "pausa_min", "cubre"],
  work_day_notes: ["fecha", "nota"],
  transactions: ["id", "fecha", "tipo", "importe", "category_id", "nota", "recurring_id", "payslip_id", "hormiga", "orden"],
  shifts: ["id", "fecha", "tipo", "hora_entrada", "hora_salida", "pausa_min", "extra_min", "nota", "cubre"],
  payslips: ["id", "mes", "fecha_cobro", "bruto", "irpf", "seg_social", "otros", "neto", "extras", "horas_extra_min", "transaction_id", "nota"],
}
const NUM = new Set([
  "saldo_inicial", "hormiga_max", "neto_aprox", "dia_cobro", "ahorro_mes", "horas_dia", "horas_semana", "precio_hora",
  "precio_extra", "pausa_min", "orden", "presupuesto", "importe", "dia", "objetivo_cent", "ahorrado", "semanas", "semana",
  "extra_min", "bruto", "irpf", "seg_social", "otros", "neto", "extras", "horas_extra_min",
])
const TIME = new Set(["hora_entrada", "hora_salida"])

export const keyOf = (t: Table, r: Row) =>
  SINGLE.includes(t)
    ? "me"
    : t === "work_schedule_days"
      ? `${r.semana}-${r.dia}`
      : t === "work_week_plans"
        ? `${r.lunes}-${r.dia}`
        : t === "work_day_notes"
          ? String(r.fecha)
          : String(r.id)

/** Fila tal y como llega de la base de datos → forma canónica (mismas columnas y tipos que toRows). */
export function canonical(t: Table, raw: Record<string, unknown>): Row {
  const out: Row = {}
  for (const c of COLS[t]) {
    let v = raw[c] as Row[string] | undefined
    if (v === undefined) v = null
    if (v !== null && TIME.has(c)) v = String(v).slice(0, 5)
    else if (v !== null && c === "objetivo" && t === "goals") v = Number(v)
    else if (v !== null && NUM.has(c)) v = Number(v)
    else if (v !== null && (c === "fecha" || c === "fecha_cobro" || c === "mes" || c === "ancla" || c === "fecha_limite" || c === "lunes")) v = String(v).slice(0, 10)
    out[c] = v
  }
  return out
}

const empty = (): RowSet => Object.fromEntries(TABLES.map((t) => [t, {}])) as unknown as RowSet

/** Datos de la app → filas. */
export function toRows(d: FinanceData): RowSet {
  const rs = empty()
  const s = d.settings
  const p = s.perfil || {}
  rs.profiles.me = canonical("profiles", {
    nombre: s.nombre || "",
    saldo_inicial: s.saldoInicial || 0,
    hormiga_max: s.hormigaMax || 1000,
    cobro: p.cobro ?? null,
    neto_aprox: p.neto ?? null,
    dia_cobro: p.diaCobro ?? null,
    objetivo: p.objetivo ?? null,
    ahorro_mes: p.ahorroMes ?? null,
    onboarding_done: !!p.done,
  })
  const w = d.work.cfg
  rs.work_settings.me = canonical("work_settings", {
    horas_dia: w.horasDia,
    horas_semana: w.horasSemana,
    precio_hora: w.precioHora || 0,
    precio_extra: w.precioExtra || 0,
    hora_entrada: w.ini,
    hora_salida: w.fin,
    pausa_min: w.pausa || 0,
  })
  s.cats.forEach((c, i) => {
    rs.categories[c.id] = canonical("categories", {
      id: c.id,
      nombre: c.n,
      tipo: c.t,
      grupo: c.t === "g" ? c.g || "des" : null,
      orden: i,
      presupuesto: s.budgets[c.id] || null,
    })
  })
  for (const r of s.recs)
    rs.recurring[r.id] = canonical("recurring", { id: r.id, nombre: r.n, tipo: r.t, importe: r.c, category_id: r.cat, dia: r.dia, activo: r.on !== false })
  for (const g of d.goals)
    rs.goals[g.id] = canonical("goals", { id: g.id, nombre: g.n, objetivo: g.obj, ahorrado: g.ah, fecha_limite: g.fecha ? `${g.fecha}-01` : null })
  for (const a of d.aportes || [])
    if (rs.goals[a.goal]) rs.goal_contributions[a.id] = canonical("goal_contributions", { id: a.id, goal_id: a.goal, fecha: a.d, importe: a.c })
  const sch = w.schedule
  if (sch) {
    rs.work_schedules.me = canonical("work_schedules", { activo: sch.on, ancla: sch.anchor, semanas: sch.weeks.length })
    sch.weeks.forEach((wk, i) =>
      wk.forEach((p2, j) => {
        if (p2)
          rs.work_schedule_days[`${i}-${j}`] = canonical("work_schedule_days", {
            semana: i,
            dia: j,
            hora_entrada: p2.ini,
            hora_salida: p2.fin,
            pausa_min: p2.pausa || 0,
            cubre: !!p2.cubre,
          })
      })
    )
  }
  for (const [fecha, nota] of Object.entries(d.work.notes || {}))
    rs.work_day_notes[fecha] = canonical("work_day_notes", { fecha, nota })
  for (const [lunes, wk] of Object.entries(w.weekPlans || {}))
    wk.forEach((p2, j) => {
      rs.work_week_plans[`${lunes}-${j}`] = canonical("work_week_plans", {
        lunes,
        dia: j,
        hora_entrada: p2 ? p2.ini : null,
        hora_salida: p2 ? p2.fin : null,
        pausa_min: p2 ? p2.pausa || 0 : 0,
        cubre: !!p2?.cubre,
      })
    })
  for (const t of Object.values(d.months).flat())
    rs.transactions[t.id] = canonical("transactions", {
      id: t.id,
      fecha: t.d,
      tipo: t.t,
      importe: t.c,
      category_id: t.cat,
      nota: t.n || "",
      recurring_id: t.rec ?? null,
      payslip_id: t.ps ?? null,
      hormiga: typeof t.h === "boolean" ? t.h : null,
      orden: t.k || 0,
    })
  for (const x of d.work.shifts)
    rs.shifts[x.id] = canonical("shifts", {
      id: x.id,
      fecha: x.d,
      tipo: x.kind,
      hora_entrada: x.ini || null,
      hora_salida: x.fin || null,
      pausa_min: x.pausa || 0,
      extra_min: x.ex ?? null,
      nota: x.n || "",
      cubre: !!x.cubre,
    })
  for (const p3 of d.payslips)
    rs.payslips[p3.id] = canonical("payslips", {
      id: p3.id,
      mes: `${p3.m}-01`,
      fecha_cobro: p3.dPago,
      bruto: p3.bruto,
      irpf: p3.irpf,
      seg_social: p3.ss,
      otros: p3.otros,
      neto: p3.neto,
      extras: p3.extras,
      horas_extra_min: p3.horasExtra,
      transaction_id: p3.txId ?? null,
      nota: p3.n || "",
    })
  return rs
}

/** Filas → datos de la app. */
export function fromRows(rs: RowSet): FinanceData {
  const pr = rs.profiles.me
  const cats = Object.values(rs.categories).sort((a, b) => Number(a.orden) - Number(b.orden))
  const budgets: Record<string, number> = {}
  for (const c of cats) if (c.presupuesto) budgets[String(c.id)] = Number(c.presupuesto)
  const months: Record<string, Tx[]> = {}
  for (const r of Object.values(rs.transactions)) {
    const t: Tx = { id: String(r.id), k: Number(r.orden) || 0, d: String(r.fecha), t: r.tipo as Tx["t"], c: Number(r.importe), cat: String(r.category_id), n: String(r.nota || "") }
    if (r.recurring_id) t.rec = String(r.recurring_id)
    if (r.payslip_id) t.ps = String(r.payslip_id)
    if (typeof r.hormiga === "boolean") t.h = r.hormiga
    ;(months[t.d.slice(0, 7)] ||= []).push(t)
  }
  for (const m of Object.keys(months)) months[m].sort(byDate)

  const ws = rs.work_settings.me
  const sch = rs.work_schedules.me
  let schedule: FinanceData["work"]["cfg"]["schedule"]
  if (sch) {
    const n = Number(sch.semanas) || 1
    const weeks: (DayPlan | null)[][] = Array.from({ length: n }, () => Array(7).fill(null))
    for (const d of Object.values(rs.work_schedule_days)) {
      const i = Number(d.semana),
        j = Number(d.dia)
      if (i < n && j < 7)
        weeks[i][j] = { ini: String(d.hora_entrada), fin: String(d.hora_salida), pausa: Number(d.pausa_min) || 0, ...(d.cubre ? { cubre: true } : {}) }
    }
    schedule = { on: !!sch.activo, anchor: String(sch.ancla), weeks }
  }
  const weekPlans: Record<string, (DayPlan | null)[]> = {}
  for (const d of Object.values(rs.work_week_plans)) {
    const k = String(d.lunes)
    const wk = (weekPlans[k] ||= Array(7).fill(null))
    const j = Number(d.dia)
    if (j >= 0 && j < 7 && d.hora_entrada && d.hora_salida)
      wk[j] = { ini: String(d.hora_entrada), fin: String(d.hora_salida), pausa: Number(d.pausa_min) || 0, ...(d.cubre ? { cubre: true } : {}) }
  }

  return loadAll({
    hasSettings: true,
    settings: {
      cats: cats.map((c) => ({ id: String(c.id), n: String(c.nombre), t: c.tipo as "g" | "i", ...(c.tipo === "g" ? { g: (c.grupo || "des") as "nec" | "des" } : {}) })),
      budgets,
      saldoInicial: Number(pr?.saldo_inicial) || 0,
      recs: Object.values(rs.recurring).map((r) => ({
        id: String(r.id),
        n: String(r.nombre),
        t: r.tipo as "g" | "i",
        c: Number(r.importe),
        cat: String(r.category_id),
        dia: Number(r.dia),
        on: !!r.activo,
      })),
      started: true,
      hormigaMax: Number(pr?.hormiga_max) || 1000,
      nombre: String(pr?.nombre || ""),
      perfil: {
        done: !!pr?.onboarding_done,
        ...(pr?.cobro ? { cobro: pr.cobro as never } : {}),
        ...(pr?.neto_aprox != null ? { neto: Number(pr.neto_aprox) } : {}),
        ...(pr?.dia_cobro != null ? { diaCobro: Number(pr.dia_cobro) } : {}),
        ...(pr?.objetivo ? { objetivo: pr.objetivo as never } : {}),
        ...(pr?.ahorro_mes != null ? { ahorroMes: Number(pr.ahorro_mes) } : {}),
      },
    },
    goals: Object.values(rs.goals).map((g) => ({
      id: String(g.id),
      n: String(g.nombre),
      obj: Number(g.objetivo),
      ah: Number(g.ahorrado) || 0,
      ...(g.fecha_limite ? { fecha: String(g.fecha_limite).slice(0, 7) } : {}),
    })),
    aportes: Object.values(rs.goal_contributions).map((a) => ({ id: String(a.id), goal: String(a.goal_id), d: String(a.fecha), c: Number(a.importe) })),
    months,
    work: {
      cfg: {
        horasDia: Number(ws?.horas_dia) || 8,
        horasSemana: Number(ws?.horas_semana) || 40,
        precioHora: Number(ws?.precio_hora) || 0,
        precioExtra: Number(ws?.precio_extra) || 0,
        ini: String(ws?.hora_entrada || "09:00"),
        fin: String(ws?.hora_salida || "17:30"),
        pausa: Number(ws?.pausa_min ?? 30),
        ...(schedule ? { schedule } : {}),
        ...(Object.keys(weekPlans).length ? { weekPlans } : {}),
      },
      ...(Object.keys(rs.work_day_notes).length
        ? { notes: Object.fromEntries(Object.values(rs.work_day_notes).map((n) => [String(n.fecha), String(n.nota)])) }
        : {}),
      shifts: Object.values(rs.shifts).map((x) => {
        const s: Shift = {
          id: String(x.id),
          d: String(x.fecha),
          kind: x.tipo as Shift["kind"],
          ini: x.hora_entrada ? String(x.hora_entrada) : "",
          fin: x.hora_salida ? String(x.hora_salida) : "",
          pausa: Number(x.pausa_min) || 0,
        }
        if (x.extra_min != null) s.ex = Number(x.extra_min)
        if (x.nota) s.n = String(x.nota)
        if (x.cubre) s.cubre = true
        return s
      }),
    },
    payslips: Object.values(rs.payslips)
      .map((p) => ({
        id: String(p.id),
        m: String(p.mes).slice(0, 7),
        dPago: String(p.fecha_cobro),
        bruto: Number(p.bruto),
        irpf: Number(p.irpf),
        ss: Number(p.seg_social),
        otros: Number(p.otros),
        neto: Number(p.neto),
        extras: Number(p.extras),
        horasExtra: Number(p.horas_extra_min),
        ...(p.transaction_id ? { txId: String(p.transaction_id) } : {}),
        ...(p.nota ? { n: String(p.nota) } : {}),
      }))
      .sort((a, b) => b.m.localeCompare(a.m)),
  })
}

/** ¿La nube tiene datos del usuario (más allá del perfil vacío que se crea al registrarse)? */
export function hasCloudData(rs: RowSet) {
  return (
    !!rs.profiles.me?.onboarding_done ||
    ["categories", "transactions", "goals", "shifts", "payslips", "recurring"].some((t) => Object.keys(rs[t as Table]).length > 0)
  )
}

export const sameRow = (a: Row | undefined, b: Row | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** Copia profunda sencilla de un RowSet. */
export const cloneRows = (rs: RowSet): RowSet => JSON.parse(JSON.stringify(rs))

