"use client"

import { MONEDAS, type Moneda } from "@/lib/finance"
import { cn } from "@/lib/utils"

/** Lista para elegir la moneda (Euro, Peso argentino, Dólar). Se usa en Cuenta y preferencias y en Ajustes. */
export function MonedaPicker({ value, onChange }: { value: Moneda; onChange: (m: Moneda) => void }) {
  return (
    <div role="radiogroup" aria-label="Moneda" className="grid gap-2">
      {(Object.keys(MONEDAS) as Moneda[]).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          onClick={() => onChange(m)}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 ring-foreground/10 transition-colors",
            value === m ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/60"
          )}
        >
          <span className="grid h-9 min-w-9 shrink-0 place-items-center rounded-full bg-primary/15 px-1.5 font-heading text-base font-semibold text-primary">
            {MONEDAS[m].sim}
          </span>
          <span className="grid leading-tight">
            <span className="font-medium">{MONEDAS[m].nombre}</span>
            <span className="text-xs text-muted-foreground">{MONEDAS[m].zona}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
