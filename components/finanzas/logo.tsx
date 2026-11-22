import * as React from "react"

import { cn } from "@/lib/utils"

/** Marca de Orbe: el anillo luminoso con barras de crecimiento. */
export function OrbeMark({
  className,
  animated = false,
  tile = true,
}: {
  className?: string
  animated?: boolean
  tile?: boolean
}) {
  const id = React.useId().replace(/:/g, "")
  const bar = (x: number, y: number, h: number, fill: string, op: number, delay: number) => (
    <rect
      x={x}
      y={y}
      width="30"
      height={h}
      rx="9"
      fill={fill}
      opacity={op}
      className={animated ? "splash-bar" : undefined}
      style={animated ? { animationDelay: `${delay}s` } : undefined}
    />
  )
  return (
    <svg viewBox="0 0 512 512" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#23717B" />
          <stop offset="0.62" stopColor="#1F2B2D" />
        </linearGradient>
        <radialGradient id={`${id}v`} cx="0.42" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#1B3A40" />
          <stop offset="1" stopColor="#0B1416" />
        </radialGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E5F9F8" />
          <stop offset="0.45" stopColor="#12B2C1" />
          <stop offset="1" stopColor="#0D8A9E" />
        </linearGradient>
        <filter id={`${id}g`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      {tile ? <rect width="512" height="512" rx="116" fill={`url(#${id}bg)`} /> : null}
      <circle
        cx="256"
        cy="256"
        r="146"
        fill="none"
        stroke="#12B2C1"
        strokeWidth="40"
        opacity="0.75"
        filter={`url(#${id}g)`}
        className={animated ? "splash-glow" : undefined}
      />
      <circle cx="256" cy="256" r="146" fill={`url(#${id}v)`} />
      <circle
        cx="256"
        cy="256"
        r="146"
        fill="none"
        stroke={`url(#${id}r)`}
        strokeWidth="30"
        pathLength={1}
        transform="rotate(-90 256 256)"
        className={animated ? "splash-ring" : undefined}
      />
      {bar(192, 262, 64, "#E5F9F8", 0.55, 0.75)}
      {bar(241, 226, 100, "#E5F9F8", 0.8, 0.88)}
      {bar(290, 186, 140, "#12B2C1", 1, 1.01)}
      <circle
        cx="200"
        cy="196"
        r="9"
        fill="#E5F9F8"
        opacity="0.9"
        className={animated ? "splash-rise" : undefined}
        style={animated ? { animationDelay: "1.2s" } : undefined}
      />
    </svg>
  )
}

export function OrbeWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <OrbeMark className="size-8" />
      <span className="grid leading-none">
        <span className="font-heading text-[17px] font-bold tracking-tight">Orbe</span>
        <span className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          control financiero
        </span>
      </span>
    </span>
  )
}
