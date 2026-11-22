/* La voz de Orbi: mensajes de reacción y consejos según la pantalla y los datos. */
import {
  CUR,
  eur,
  eur0,
  hormigaStats,
  monthStats,
  pct,
  rule503020,
  todayStr,
  type FinanceData,
} from "@/lib/finance"
import { addDays, dayTotals, fmtH, fmtMin, monthDays, payslipYear, summarize, weekStart } from "@/lib/work"
import type { OrbiMood } from "@/components/finanzas/orbi"

export interface OrbiLine {
  text: string
  mood?: OrbiMood
}

declare global {
  interface Window {
    __orbiOn?: boolean
  }
}

/** Hace hablar a Orbi. Devuelve false si Orbi está oculto (para mostrar un aviso normal). */
export function orbiSay(text: string, mood: OrbiMood = "happy") {
  if (typeof window === "undefined" || !window.__orbiOn) return false
  window.dispatchEvent(new CustomEvent<OrbiLine>("orbi:say", { detail: { text, mood } }))
  return true
}

export const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

const GENERAL: OrbiLine[] = [
  { text: "Truco: antes de un capricho, espera 24 horas. Si mañana lo sigues queriendo, adelante.", mood: "think" },
  { text: "Págate primero: el día que cobres, aparta algo para ahorrar antes de gastar.", mood: "happy" },
  { text: "Un buen fondo de emergencia cubre de 3 a 6 meses de tus gastos. ¿Creamos una meta?", mood: "think" },
  { text: "Revisa tus suscripciones cada pocos meses. Siempre hay alguna que ya no usas.", mood: "wow" },
  { text: "Apuntar cada gasto en el momento es el superpoder de la gente que ahorra.", mood: "happy" },
  { text: "Guarda las nóminas: el IRPF retenido de más te lo devuelven en la renta.", mood: "think" },
]

export function buddyTips(view: string, data: FinanceData): OrbiLine[] {
  const cur = CUR()
  const tips: OrbiLine[] = []
  const st = monthStats(data.months[cur] || [])
  const hs = hormigaStats(data, cur)
  const map = dayTotals(data.work.shifts, data.work.cfg)

  const obj = data.settings.perfil?.objetivo
  if (view === "inicio") {
    if (obj === "deudas")
      tips.push({ text: "Para tus deudas: paga primero la que tenga más interés y nunca dejes de pagar el mínimo de las demás.", mood: "think" })
    if (obj === "controlar")
      tips.push({ text: "Para gastar menos, pon límite a 2 o 3 categorías en Presupuestos. Yo te aviso cuando te acerques.", mood: "think" })
    if (obj === "emergencia")
      tips.push({ text: "Cada euro en tu fondo de emergencia es tranquilidad. Apartarlo el día que cobras es lo que mejor funciona.", mood: "happy" })
    if (obj === "saber")
      tips.push({ text: "Apunta todo durante un mes, hasta el café. Al final sabrás exactamente a dónde va tu dinero.", mood: "happy" })
  }
  if (view === "inicio" || view === "resumen") {
    if (st.inc > 0 && st.rate != null)
      tips.push(
        st.rate >= 0.2
          ? { text: `Este mes estás ahorrando un ${pct(st.rate)} de lo que entra. ¡Eso es nivel experto!`, mood: "happy" }
          : { text: `Vas ahorrando un ${pct(Math.max(0, st.rate))}. Si llegas al 20 %, te hago un bailecito.`, mood: "think" }
      )
    if (hs.total > 0) tips.push({ text: `Llevo contadas ${hs.count} hormigas este mes: ${eur(hs.total)}. Al año serían ${eur0(hs.year)}.`, mood: "wow" })
    const r = rule503020(data.months[cur] || [], data.settings.cats)
    if (r.inc && r.des / r.inc > 0.3) tips.push({ text: `Los caprichos ya son el ${pct(r.des / r.inc)} de tus ingresos. El objetivo es no pasar del 30 %.`, mood: "think" })
  }
  if (view === "trabajo" || view === "inicio") {
    const ws = weekStart(todayStr())
    const week = summarize(Array.from({ length: 7 }, (_, i) => map[addDays(ws, i)]).filter(Boolean), data.work.cfg)
    const mo = summarize(monthDays(map, cur), data.work.cfg)
    if (week.min) tips.push({ text: `Esta semana llevas ${fmtH(week.min)} trabajadas. ¡Máquina!`, mood: "happy" })
    if (mo.extra) tips.push({ text: `Este mes suman ${fmtMin(mo.extra)} extra. Comprueba que salen en tu nómina.`, mood: "think" })
  }
  if (view === "nominas") {
    const y = payslipYear(data.payslips, cur.slice(0, 4))
    if (y.list.length)
      tips.push({ text: `Este año te han retenido ${eur0(y.irpf)} de IRPF (${pct(y.irpfRate)}). Parte puede volver en la renta.`, mood: "think" })
    tips.push({ text: "Si tu neto baja sin motivo, mira el IRPF: a veces lo suben al cobrar horas extra.", mood: "think" })
  }
  if (view === "hormiga" && hs.year)
    tips.push({ text: `Si recortas tus hormigas a la mitad, ahorras unos ${eur0(hs.year / 2)} al año. ¿Lo intentamos?`, mood: "happy" })
  if (view === "metas") {
    const g = [...data.goals].filter((x) => x.obj > 0 && x.ah < x.obj).sort((a, b) => b.ah / b.obj - a.ah / a.obj)[0]
    if (g) tips.push({ text: `«${g.n}» va por el ${pct(g.ah / g.obj)}. Te faltan ${eur(g.obj - g.ah)}. ¡Tú puedes!`, mood: "happy" })
  }
  return tips.length ? [...tips, pick(GENERAL)] : [pick(GENERAL)]
}

export function greetingLine(nombre: string): OrbiLine {
  const h = new Date().getHours()
  const hi = h < 6 ? "¿Trasnochando" : h < 13 ? "¡Buenos días" : h < 21 ? "¡Buenas tardes" : "¡Buenas noches"
  const who = nombre ? `, ${nombre}` : ""
  const end = h < 6 ? "?" : "!"
  return pick([
    { text: `${hi}${who}${end} Toca el + cuando quieras apuntar algo.`, mood: "wave" as OrbiMood },
    { text: `${hi}${who}${end} Hoy es un buen día para ahorrar un poquito.`, mood: "wave" as OrbiMood },
    { text: `${hi}${who}${end} Estoy aquí si necesitas un consejo. Tócame.`, mood: "wave" as OrbiMood },
  ])
}
