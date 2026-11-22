/*
 * Recordatorios: a partir de los datos y las preferencias se construye la «agenda»
 * de los próximos días (hora local + texto). Se guarda en Supabase y el servidor la
 * envía como notificación cuando llega la hora, aunque la app esté cerrada.
 * Los textos no llevan importes: una notificación puede verla cualquiera.
 */
import { addMonths, daysIn, pad, todayStr, type FinanceData } from "@/lib/finance"
import { addDays, planFor, toMin } from "@/lib/work"

/** Clave pública VAPID (la privada vive solo en el servidor). */
export const VAPID_PUBLIC_KEY = "BFG_liHxU0rPVIy8p3pmLciaq04a-O-Cfzvc8drLr_7tgNc6su-euy4L70ja7mlyP57JouLE1d_Y7rMz5RnlYjk"

export interface ReminderPrefs {
  diario: boolean
  horaDiario: string // HH:MM
  fichar: boolean
  nomina: boolean
  fijos: boolean
  semanal: boolean
  nudge: boolean
}
export const DEFAULT_PREFS: ReminderPrefs = {
  diario: true,
  horaDiario: "21:00",
  fichar: true,
  nomina: true,
  fijos: true,
  semanal: true,
  nudge: true,
}

export interface AgendaItem {
  id: string
  at: string // AAAA-MM-DDTHH:MM, hora local
  title: string
  body: string
  url: string
  tag: string
}

const DAYS = 14
const hhmm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`
const nowLocal = () => {
  const d = new Date()
  return `${todayStr()}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function buildAgenda(data: FinanceData, prefs: ReminderPrefs): AgendaItem[] {
  const out: AgendaItem[] = []
  const today = todayStr()
  const now = nowLocal()
  const name = data.settings.nombre ? `, ${data.settings.nombre}` : ""
  const txDays = new Set(Object.values(data.months).flat().map((t) => t.d))
  const shiftDays = new Set(data.work.shifts.map((s) => s.d))
  const cfg = data.work.cfg
  const cobro = data.settings.perfil?.cobro
  const works = cobro === "fija" || cobro === "horas" || !!cfg.schedule?.on || data.work.shifts.length > 0
  const add = (it: AgendaItem) => {
    if (it.at > now) out.push(it)
  }

  for (let i = 0; i < DAYS; i++) {
    const d = addDays(today, i)
    const [y, m, dd] = d.split("-").map(Number)
    const wd = (new Date(y, m - 1, dd).getDay() + 6) % 7 // 0 = lunes

    // Resumen diario (si ese día aún no se ha apuntado nada).
    if (prefs.diario && !(i === 0 && txDays.has(d)))
      add({
        id: `diario-${d}`,
        at: `${d}T${prefs.horaDiario}`,
        title: `¿Qué tal el día${name}?`,
        body: "Apunta tus gastos de hoy en 10 segundos. Tus hormigas no se van a contar solas 🐜",
        url: "/#movimientos",
        tag: "orbe-diario",
      })

    // Fichar al acabar el turno (horario por turnos o jornada de lunes a viernes).
    if (prefs.fichar && works && !shiftDays.has(d)) {
      const plan = planFor(d, cfg)
      const fin = plan ? toMin(plan.fin) : plan === undefined && wd < 5 ? toMin(cfg.fin) : null
      if (fin != null)
        add({
          id: `fichar-${d}`,
          at: `${d}T${hhmm(fin + 10)}`,
          title: "¿Fichamos tu jornada? ⏱️",
          body: `Tu turno de hoy acaba a las ${hhmm(fin)}. Regístralo con un toque para no perder ninguna hora extra.`,
          url: "/#trabajo",
          tag: "orbe-fichar",
        })
    }

    // Resumen semanal, los domingos.
    if (prefs.semanal && wd === 6)
      add({
        id: `semanal-${d}`,
        at: `${d}T19:00`,
        title: "Tu semana en Orbe 📊",
        body: "Mira cuánto has gastado esta semana y cómo vas con tu objetivo de ahorro.",
        url: "/#resumen",
        tag: "orbe-semanal",
      })
  }

  // Día de cobro de la nómina (este mes y el siguiente).
  const diaCobro = data.settings.perfil?.diaCobro
  if (prefs.nomina && diaCobro) {
    for (const mo of [today.slice(0, 7), addMonths(today.slice(0, 7), 1)]) {
      const d = `${mo}-${pad(Math.min(diaCobro, daysIn(mo)))}`
      const yaApuntada = data.payslips.some((p) => p.dPago.startsWith(mo)) || (data.months[mo] || []).some((t) => t.cat === "nomina")
      if (!yaApuntada && d <= addDays(today, DAYS))
        add({
          id: `nomina-${mo}`,
          at: `${d}T10:00`,
          title: "¡Día de cobro! 💸",
          body: "¿Ha llegado tu nómina? Apúntala para ver tu neto, tu IRPF y cuánto puedes ahorrar.",
          url: "/#nominas",
          tag: "orbe-nomina",
        })
    }
  }

  // Gastos e ingresos fijos del día (solo nombres, sin importes).
  if (prefs.fijos) {
    const byDay: Record<string, string[]> = {}
    for (const r of data.settings.recs) {
      if (r.on === false) continue
      for (const mo of [today.slice(0, 7), addMonths(today.slice(0, 7), 1)]) {
        const d = `${mo}-${pad(Math.min(r.dia, daysIn(mo)))}`
        const hecho = (data.months[mo] || []).some((t) => t.rec === r.id)
        if (!hecho && d >= today && d <= addDays(today, DAYS)) (byDay[d] ||= []).push(r.n)
      }
    }
    for (const [d, names] of Object.entries(byDay))
      add({
        id: `fijos-${d}`,
        at: `${d}T09:30`,
        title: "Hoy toca apuntar tus fijos",
        body: names.length === 1 ? `${names[0]}. Apúntalo con un toque desde Inicio.` : `${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}. Apúntalos con un toque desde Inicio.`,
        url: "/#inicio",
        tag: "orbe-fijos",
      })
  }

  return out.sort((a, b) => a.at.localeCompare(b.at)).slice(0, 250)
}
