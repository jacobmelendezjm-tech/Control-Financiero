"use client"

import * as React from "react"
import {
  BriefcaseIcon,
  BusIcon,
  CircleDollarSignIcon,
  CoffeeIcon,
  GiftIcon,
  GraduationCapIcon,
  HandCoinsIcon,
  HeartPulseIcon,
  HomeIcon,
  PackageIcon,
  RepeatIcon,
  ShirtIcon,
  ShoppingCartIcon,
  SmartphoneIcon,
  SparklesIcon,
  TicketIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

const CAT_ICON: Record<string, LucideIcon> = {
  casa: HomeIcon,
  super: ShoppingCartIcon,
  transporte: BusIcon,
  facturas: SmartphoneIcon,
  estudios: GraduationCapIcon,
  salud: HeartPulseIcon,
  comer: CoffeeIcon,
  ocio: TicketIcon,
  ropa: ShirtIcon,
  subs: RepeatIcon,
  regalos: GiftIcon,
  "otros-g": PackageIcon,
  nomina: BriefcaseIcon,
  extras: SparklesIcon,
  ayudas: HandCoinsIcon,
  "otros-i": WalletIcon,
}

export function CatIcon({ id, income, className }: { id: string; income?: boolean; className?: string }) {
  const Icon = CAT_ICON[id] || CircleDollarSignIcon
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-2xl",
        income ? "bg-in/12 text-in" : "bg-secondary text-foreground/80",
        className
      )}
    >
      <Icon className="size-5" strokeWidth={1.9} />
    </span>
  )
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mt-2 mb-2.5 flex items-center justify-between gap-3 px-1">
      <h2 className="font-heading text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase", className)}>
      {children}
    </p>
  )
}

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode
  tone?: "neutral" | "good" | "bad" | "gold" | "glass"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        tone === "neutral" && "bg-secondary text-secondary-foreground",
        tone === "good" && "bg-good/15 text-good",
        tone === "bad" && "bg-bad/12 text-bad",
        tone === "gold" && "bg-gold text-[#1f2b2d]",
        tone === "glass" && "bg-white/12 text-white ring-1 ring-white/15",
        className
      )}
    >
      {children}
    </span>
  )
}

export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid min-w-0 gap-0.5 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/8", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate font-heading text-xl font-semibold tracking-tight tabular-nums">{value}</span>
      {sub ? <span className="text-[11px] text-muted-foreground">{sub}</span> : null}
    </div>
  )
}

export interface BarDatum {
  key: string
  label: string
  value: number
  /** Texto que se muestra al tocar la barra y que lee el lector de pantalla. */
  display: string
  highlight?: boolean
  muted?: boolean
}

/** Barras verticales de una sola serie. Toca o pasa por encima para ver el valor. */
export function MiniBars({
  data,
  height = 120,
  className,
  onSelect,
}: {
  data: BarDatum[]
  height?: number
  className?: string
  onSelect?: (key: string) => void
}) {
  const [active, setActive] = React.useState<string | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className={cn("grid", className)}>
      <div
        className="grid items-end gap-1.5"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`, height }}
        onMouseLeave={() => setActive(null)}
      >
        {data.map((d) => {
          const h = d.value > 0 ? Math.max(6, (d.value / max) * (height - 26)) : 4
          const on = active === d.key
          return (
            <button
              key={d.key}
              type="button"
              aria-label={`${d.label}: ${d.display}`}
              onMouseEnter={() => setActive(d.key)}
              onFocus={() => setActive(d.key)}
              onBlur={() => setActive(null)}
              onClick={() => {
                setActive(d.key)
                onSelect?.(d.key)
              }}
              className="group relative flex h-full flex-col items-center justify-end outline-none"
            >
              <span
                className={cn(
                  "pointer-events-none absolute z-10 rounded-md bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap text-background opacity-0 shadow transition-opacity",
                  on && "opacity-100"
                )}
                style={{ bottom: h + 6 }}
              >
                {d.display}
              </span>
              <span
                className={cn(
                  "w-full max-w-9 rounded-t-[6px] rounded-b-[3px] transition-[background-color,filter]",
                  d.highlight ? "bg-gold" : d.muted ? "bg-muted-foreground/20" : "bg-primary/35 dark:bg-primary/45",
                  on && "brightness-90 dark:brightness-125",
                  "group-focus-visible:ring-2 group-focus-visible:ring-ring"
                )}
                style={{ height: h }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d) => (
          <span
            key={d.key}
            className={cn(
              "truncate text-center text-[11px] text-muted-foreground",
              d.highlight && "font-semibold text-foreground"
            )}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Barra de progreso fina con color de estado. */
export function Meter({
  value,
  tone = "primary",
  className,
  label,
}: {
  value: number
  tone?: "primary" | "gold" | "good" | "warn" | "bad"
  className?: string
  label?: string
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.max(0, Math.min(1, value)) * 100)}
      className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          tone === "primary" && "bg-primary",
          tone === "gold" && "bg-gold",
          tone === "good" && "bg-good",
          tone === "warn" && "bg-warn",
          tone === "bad" && "bg-bad"
        )}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  )
}

export const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"]
export const WEEKDAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
