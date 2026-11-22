"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type OrbiMood = "idle" | "happy" | "wave" | "think" | "wow"

/**
 * Orbi, el asistente de Orbe: casco blanco brillante, visor oscuro con anillo cian
 * luminoso, cuerpo de cápsula y propulsor. Dibujo original en SVG.
 */
export function Orbi({
  mood = "idle",
  className,
  float = true,
  style,
}: {
  mood?: OrbiMood
  className?: string
  float?: boolean
  style?: React.CSSProperties
}) {
  const id = React.useId().replace(/:/g, "")
  const eye = "#8ff6ff"
  return (
    <svg viewBox="0 0 120 156" className={cn("overflow-visible", className)} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}shell`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#eaf7f7" />
          <stop offset="1" stopColor="#b9dcde" />
        </linearGradient>
        <radialGradient id={`${id}visor`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#1f4148" />
          <stop offset="0.6" stopColor="#0d1a1d" />
          <stop offset="1" stopColor="#060c0d" />
        </radialGradient>
        <linearGradient id={`${id}flame`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e5f9f8" />
          <stop offset="0.35" stopColor="#12b2c1" />
          <stop offset="1" stopColor="#12b2c1" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}soft`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <g className={float ? "orbi-float" : undefined} style={{ transformOrigin: "60px 80px" }}>
        {/* propulsor */}
        <ellipse cx="60" cy="142" rx="16" ry="6" fill="#12b2c1" opacity="0.55" filter={`url(#${id}soft)`} />
        <path className="orbi-flame" d="M51 128 Q60 156 69 128 Z" fill={`url(#${id}flame)`} />

        {/* brazos */}
        <g
          className={mood === "wave" ? "orbi-wave" : undefined}
          style={{ transformOrigin: "37px 88px", transform: mood === "wave" ? undefined : "rotate(18deg)" }}
        >
          <rect x="31" y="86" width="11" height="30" rx="5.5" fill={`url(#${id}shell)`} />
          <circle cx="36.5" cy="117" r="5" fill="#1f2b2d" />
        </g>
        <g style={{ transformOrigin: "83px 88px", transform: mood === "wow" ? "rotate(-40deg)" : "rotate(-18deg)" }}>
          <rect x="78" y="86" width="11" height="30" rx="5.5" fill={`url(#${id}shell)`} />
          <circle cx="83.5" cy="117" r="5" fill="#1f2b2d" />
        </g>

        {/* cuerpo */}
        <path d="M38 86 Q38 78 47 78 H73 Q82 78 82 86 V110 Q82 131 60 133 Q38 131 38 110 Z" fill={`url(#${id}shell)`} />
        <path d="M76 84 V112 Q76 124 66 128" stroke="#12b2c1" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.85" filter={`url(#${id}glow)`} />
        <circle className="orbi-pulse" cx="56" cy="98" r="3.6" fill="#12b2c1" filter={`url(#${id}glow)`} />
        <path d="M44 88 Q45 82 52 81" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9" />

        {/* cuello */}
        <rect x="51" y="74" width="18" height="7" rx="3.5" fill="#1f2b2d" />

        {/* cabeza */}
        <circle cx="60" cy="44" r="38" fill={`url(#${id}shell)`} />
        <path d="M33 30 Q40 14 58 10" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.95" />
        <circle cx="60" cy="46" r="29" fill="none" stroke="#12b2c1" strokeWidth="9" opacity="0.5" filter={`url(#${id}soft)`} />
        <circle cx="60" cy="46" r="27.5" fill={`url(#${id}visor)`} />
        <circle cx="60" cy="46" r="28.5" fill="none" stroke="#12b2c1" strokeWidth="4.5" filter={`url(#${id}glow)`} />
        <path d="M42 36 Q47 26 58 24" stroke="#e5f9f8" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.35" />

        {/* cara */}
        <g filter={`url(#${id}glow)`}>
          <Face mood={mood} eye={eye} />
        </g>
      </g>
    </svg>
  )
}

function Face({ mood, eye }: { mood: OrbiMood; eye: string }) {
  if (mood === "happy" || mood === "wave")
    return (
      <g stroke={eye} strokeWidth="3.4" fill="none" strokeLinecap="round">
        <path d="M45 49 Q50 41 55 49" />
        <path d="M65 49 Q70 41 75 49" />
        <path d="M54 56 Q60 61 66 56" strokeWidth="2.6" />
      </g>
    )
  if (mood === "wow")
    return (
      <g fill={eye}>
        <circle cx="50" cy="45" r="5.2" />
        <circle cx="70" cy="45" r="5.2" />
        <ellipse cx="60" cy="58" rx="3.2" ry="3.8" />
      </g>
    )
  if (mood === "think")
    return (
      <g fill={eye} transform="translate(3 -3)">
        <rect x="47" y="42" width="6" height="7" rx="3" />
        <rect x="64" y="40" width="7" height="9" rx="3.5" />
        <path d="M53 58 H63" stroke={eye} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    )
  return (
    <g className="orbi-eyes" fill={eye}>
      <rect x="46" y="39" width="7" height="13" rx="3.5" />
      <rect x="67" y="39" width="7" height="13" rx="3.5" />
    </g>
  )
}
