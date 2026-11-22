"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Orbi, type OrbiMood } from "@/components/finanzas/orbi"
import type { FinanceData } from "@/lib/finance"
import { buddyTips, greetingLine, type OrbiLine } from "@/lib/orbi"
import { cn } from "@/lib/utils"

/* ---------- texto que se escribe solo ---------- */
function useTypewriter(text: string, speed = 17) {
  const [n, setN] = React.useState(0)
  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // Reinicia la animación cuando cambia el texto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setN(reduce ? text.length : 0)
    if (reduce) return
    const t = setInterval(() => {
      setN((x) => {
        if (x >= text.length) {
          clearInterval(t)
          return x
        }
        return x + 1
      })
    }, speed)
    return () => clearInterval(t)
  }, [text, speed])
  return { shown: text.slice(0, n), done: n >= text.length, finish: () => setN(text.length) }
}

/* ---------- burbuja ---------- */
function Bubble({
  children,
  tail,
  tailX,
  className,
  style,
  ...rest
}: React.ComponentProps<"div"> & { tail: "top" | "bottom" | "none"; tailX?: number }) {
  return (
    <div
      {...rest}
      style={style}
      className={cn(
        "orbi-pop rounded-[22px] bg-card p-4 text-card-foreground shadow-[0_18px_50px_-12px_rgb(8_20_22/0.45)] ring-1 ring-glow/35",
        className
      )}
    >
      {tail !== "none" ? (
        <span
          aria-hidden
          className={cn(
            "absolute size-4 rotate-45 bg-card ring-1 ring-glow/35",
            tail === "top" ? "-top-2 [clip-path:polygon(0_0,100%_0,0_100%)]" : "-bottom-2 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
          )}
          style={{ left: (tailX ?? 40) - 8 }}
        />
      ) : null}
      {children}
    </div>
  )
}

/* ---------- Orbi flotante ---------- */
export function OrbiBuddy({
  view,
  data,
  nombre,
  hidden,
}: {
  view: string
  data: FinanceData
  nombre: string
  hidden: boolean
}) {
  const [line, setLine] = React.useState<OrbiLine | null>(null)
  const [stamp, setStamp] = React.useState(0)
  const idx = React.useRef(0)
  const dataRef = React.useRef(data)
  React.useEffect(() => {
    dataRef.current = data
  }, [data])

  const say = React.useCallback((l: OrbiLine) => {
    setLine(l)
    setStamp((s) => s + 1)
  }, [])

  React.useEffect(() => {
    window.__orbiOn = !hidden
    const on = (e: Event) => say((e as CustomEvent<OrbiLine>).detail)
    window.addEventListener("orbi:say", on)
    return () => {
      window.__orbiOn = false
      window.removeEventListener("orbi:say", on)
    }
  }, [hidden, say])

  // Saludo una vez por sesión, cuando termina la apertura.
  React.useEffect(() => {
    if (hidden) return
    let greeted = false
    try {
      greeted = sessionStorage.getItem("orbe.greet") === "1"
      sessionStorage.setItem("orbe.greet", "1")
    } catch {}
    if (greeted) return
    const t = setTimeout(() => say(greetingLine(nombre)), 3300)
    return () => clearTimeout(t)
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // La burbuja se esconde sola.
  React.useEffect(() => {
    if (!line) return
    const t = setTimeout(() => setLine(null), Math.max(5000, line.text.length * 70))
    return () => clearTimeout(t)
  }, [line, stamp])

  const tap = () => {
    if (navigator.vibrate) navigator.vibrate(8)
    const tips = buddyTips(view, dataRef.current)
    say(tips[idx.current % tips.length])
    idx.current++
  }

  if (hidden) return null
  return (
    <div className="pointer-events-none fixed right-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-40 md:right-6 md:bottom-28">
      {line ? <BuddyBubble key={stamp} line={line} onClose={() => setLine(null)} /> : null}
      <button
        type="button"
        onClick={tap}
        aria-label="Orbi, tu asistente. Toca para un consejo"
        className="pointer-events-auto block w-16 transition-transform active:scale-90"
      >
        <Orbi mood={line?.mood || "idle"} className="w-16 drop-shadow-[0_10px_16px_rgb(13_138_158/0.35)]" />
      </button>
    </div>
  )
}

function BuddyBubble({ line, onClose }: { line: OrbiLine; onClose: () => void }) {
  const { shown, done, finish } = useTypewriter(line.text)
  return (
    <Bubble
      tail="bottom"
      tailX={232}
      role="status"
      aria-live="polite"
      onClick={() => (done ? onClose() : finish())}
      className="pointer-events-auto absolute right-1 bottom-[92px] w-[min(270px,calc(100vw-32px))] cursor-pointer pr-9 text-[14.5px] leading-snug"
    >
      <span className="sr-only">{line.text}</span>
      <span aria-hidden>
        {shown}
        {!done ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-glow align-middle" /> : null}
      </span>
      <button
        type="button"
        aria-label="Cerrar mensaje"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
      >
        <XIcon className="size-3.5" />
      </button>
    </Bubble>
  )
}

/* ---------- tutorial ---------- */
interface Step {
  target?: string
  fixed?: boolean
  title: string
  text: string
  mood: OrbiMood
}

const STEPS: Step[] = [
  {
    title: "¡Hola! Soy Orbi",
    text: "Seré tu copiloto financiero. Vuelo por aquí para que tu dinero no se escape de órbita. ¿Te enseño la app en un minuto?",
    mood: "wave",
  },
  {
    target: "saldo",
    title: "Tu saldo, de un vistazo",
    text: "Aquí está todo tu dinero y cómo vas este mes. La etiqueta dorada te dice si este mes sumas o restas.",
    mood: "happy",
  },
  {
    target: "botones",
    title: "Apunta en dos toques",
    text: "Pulsa Ingreso cuando entre dinero y Gasto cuando salga. Cuanto antes lo apuntes, menos se te olvida.",
    mood: "idle",
  },
  {
    target: "accesos",
    title: "Atajos rápidos",
    text: "Ficha tu jornada de hoy con un toque, revisa tus nóminas, caza gastos hormiga o mira tus huchas de ahorro.",
    mood: "happy",
  },
  {
    target: "gasto7",
    title: "Tu semana en barras",
    text: "Cada barra es un día. La dorada es el día que más gastaste. Toca una barra para ver el importe exacto.",
    mood: "think",
  },
  {
    target: "trabajo",
    title: "Tus horas cuentan",
    text: "Llevo la cuenta de las horas de la semana y del mes, y de tus horas extra, para que ninguna se pierda en la nómina.",
    mood: "happy",
  },
  {
    target: "hormiga",
    title: "¡Cuidado con las hormigas!",
    text: "Cafés, chuches, apps… Gastos pequeñitos que juntos se comen tu sueldo. Yo los detecto solo y te digo cuánto suman al año.",
    mood: "wow",
  },
  {
    target: "nav-add",
    fixed: true,
    title: "El botón mágico",
    text: "Desde cualquier pantalla: apunta un gasto, un ingreso, tu jornada o tu nómina.",
    mood: "happy",
  },
  {
    target: "nav-resumen",
    fixed: true,
    title: "Análisis",
    text: "La regla 50/30/20, en qué se te va el dinero y tus últimos seis meses comparados.",
    mood: "think",
  },
  {
    target: "nav-trabajo",
    fixed: true,
    title: "Trabajo",
    text: "Tu calendario de jornadas, las horas por semana, las extras y todas tus nóminas con el IRPF.",
    mood: "idle",
  },
  {
    target: "nav-mas",
    fixed: true,
    title: "Y mucho más",
    text: "Presupuestos, metas de ahorro, copias de seguridad… y el botón para instalarme en tu móvil.",
    mood: "happy",
  },
  {
    title: "¡Todo listo!",
    text: "Me quedo flotando en la esquina. Tócame cuando quieras un consejo y te celebraré cada logro. ¡A por esos ahorros!",
    mood: "wave",
  },
]

const O = 80 // ancho de Orbi en el tutorial
const OH = O * 1.3

interface Box {
  x: number
  y: number
  w: number
  h: number
}

export function OrbiTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = React.useState(0)
  const [hl, setHl] = React.useState<Box | null>(null)
  const [vp, setVp] = React.useState({ w: 390, h: 800 })
  const [bh, setBh] = React.useState(190)
  const [ready, setReady] = React.useState(false)
  const dir = React.useRef(1)
  const bubbleRef = React.useRef<HTMLDivElement>(null)
  const primaryRef = React.useRef<HTMLButtonElement>(null)
  const step = STEPS[i]

  const finish = React.useCallback(() => {
    try {
      localStorage.setItem("orbe.tour", "done")
    } catch {}
    onClose()
  }, [onClose])

  const go = (k: number) => {
    dir.current = k >= i ? 1 : -1
    if (k >= STEPS.length) return finish()
    setI(Math.max(0, k))
  }

  // Al abrir, empezar desde el principio.
  React.useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setI(0)
  }, [open])

  // Colocar el foco en el elemento del paso.
  React.useEffect(() => {
    if (!open) return
    let alive = true
    const measure = () => {
      if (!alive) return
      setVp({ w: window.innerWidth, h: window.innerHeight })
      if (!step.target) return setHl(null)
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (!el) return
      const r = el.getBoundingClientRect()
      const pad = 8
      setHl({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 })
      setReady(true)
    }
    // Oculta la burbuja mientras se recoloca.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false)
    if (!step.target) {
      measure()
      setReady(true)
      return
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (!el) {
      // Si el elemento no existe (p. ej. sin datos), se salta el paso.
      const next = i + dir.current
      if (next >= 0 && next < STEPS.length) setI(next)
      else finish()
      return
    }
    let t: ReturnType<typeof setTimeout>
    if (!step.fixed) {
      const r = el.getBoundingClientRect()
      window.scrollTo({ top: Math.max(0, r.top + window.scrollY - 76), behavior: "smooth" })
      t = setTimeout(measure, 450)
    } else measure()
    const onResize = () => measure()
    window.addEventListener("resize", onResize)
    return () => {
      alive = false
      clearTimeout(t)
      window.removeEventListener("resize", onResize)
    }
  }, [open, i, step.target, step.fixed, finish])

  // Altura real de la burbuja para colocar a Orbi.
  React.useLayoutEffect(() => {
    if (!bubbleRef.current) return
    const ro = new ResizeObserver(() => bubbleRef.current && setBh(bubbleRef.current.offsetHeight))
    ro.observe(bubbleRef.current)
    return () => ro.disconnect()
  }, [open, i])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish()
      if (e.key === "ArrowRight") go(i + 1)
      if (e.key === "ArrowLeft" && i > 0) go(i - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  React.useEffect(() => {
    if (open && ready) primaryRef.current?.focus({ preventScroll: true })
  }, [open, ready, i])

  const { shown, done, finish: finishText } = useTypewriter(open ? step.text : "")

  if (!open) return null

  // Geometría: Orbi entre el elemento y la burbuja.
  const BW = Math.min(340, vp.w - 32)
  const target = step.target ? hl : null
  let ox: number, oy: number, bTop: number, tail: "top" | "bottom"
  if (!target) {
    ox = vp.w / 2 - O / 2
    oy = Math.max(24, vp.h / 2 - (OH + bh) / 2 - 20)
    bTop = oy + OH + 6
    tail = "top"
  } else if (step.fixed) {
    ox = Math.min(Math.max(target.x + target.w / 2 - O / 2, 12), vp.w - O - 12)
    oy = target.y - OH - 2
    bTop = oy - bh - 4
    tail = "bottom"
  } else {
    ox = Math.min(Math.max(target.x + target.w / 2 - O / 2, 12), vp.w - O - 12)
    oy = target.y + target.h + 2
    bTop = oy + OH + 4
    if (bTop + bh > vp.h - 16) {
      bTop = vp.h - 16 - bh
      oy = bTop - OH - 4
    }
    tail = "top"
  }
  const bLeft = Math.min(Math.max(ox + O / 2 - BW / 2, 16), vp.w - BW - 16)
  const tailX = ox + O / 2 - bLeft
  const last = i === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[90]" role="presentation">
      {/* oscurecido con hueco */}
      {target && ready ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-[26px] ring-2 ring-glow/80 transition-all duration-500 ease-out"
          style={{
            left: target.x,
            top: target.y,
            width: target.w,
            height: target.h,
            boxShadow: "0 0 0 200vmax rgb(6 14 16 / 0.74), 0 0 30px 4px rgb(18 178 193 / 0.45)",
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 bg-[rgb(6_14_16/0.78)] backdrop-blur-[2px] transition-opacity" />
      )}
      {/* capa que bloquea toques fuera de la burbuja */}
      <div className="absolute inset-0" onClick={() => (done ? null : finishText())} />

      {/* Orbi volando */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 transition-transform duration-700 ease-[cubic-bezier(.34,1.35,.5,1)]"
        style={{ transform: `translate(${ox}px, ${oy}px)`, width: O }}
      >
        <Orbi mood={step.mood} className="w-full drop-shadow-[0_14px_22px_rgb(18_178_193/0.45)]" />
      </div>

      {/* burbuja */}
      <div
        ref={bubbleRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="orbi-tour-title"
        className="fixed transition-[top,left] duration-500 ease-out"
        style={{ top: bTop, left: bLeft, width: BW, opacity: ready ? 1 : 0 }}
      >
        <Bubble key={i} tail={tail} tailX={tailX} className="relative">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h2 id="orbi-tour-title" className="font-heading text-[17px] font-semibold tracking-tight">
              {step.title}
            </h2>
            {!last ? (
              <button type="button" onClick={finish} className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
                Saltar
              </button>
            ) : null}
          </div>
          <p className="min-h-[3.9em] text-[14.5px] leading-snug text-muted-foreground" onClick={finishText}>
            <span className="sr-only">{step.text}</span>
            <span aria-hidden>{shown}</span>
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="flex gap-1" aria-label={`Paso ${i + 1} de ${STEPS.length}`}>
              {STEPS.map((_, k) => (
                <i
                  key={k}
                  className={cn("h-1.5 rounded-full bg-muted-foreground/25 transition-all", k === i ? "w-4 bg-primary" : "w-1.5")}
                />
              ))}
            </span>
            <span className="flex gap-1.5">
              {i === 0 ? (
                <Button variant="ghost" size="sm" onClick={finish}>
                  Ahora no
                </Button>
              ) : !last ? (
                <Button variant="ghost" size="sm" onClick={() => go(i - 1)}>
                  Atrás
                </Button>
              ) : null}
              <Button ref={primaryRef} size="sm" className="rounded-full px-4" onClick={() => go(i + 1)}>
                {i === 0 ? "¡Vamos!" : last ? "¡A ahorrar!" : "Siguiente"}
              </Button>
            </span>
          </div>
        </Bubble>
      </div>
    </div>
  )
}
