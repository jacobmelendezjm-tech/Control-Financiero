"use client"

import { MoonIcon, SunIcon } from "lucide-react"

import { useThemeSwitch } from "@/lib/theme-transition"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const switchTheme = useThemeSwitch()
  return (
    <button
      type="button"
      data-theme-toggle=""
      onClick={(e) => switchTheme(e.currentTarget)}
      className={cn(
        "relative grid size-9 place-items-center overflow-hidden rounded-full bg-card ring-1 ring-foreground/8 transition-[box-shadow,background-color] hover:shadow-md",
        className
      )}
      // Etiqueta fija: el tema no se conoce en el servidor (evita error de hidratación)
      aria-label="Cambiar entre modo claro y oscuro"
      title="Cambiar tema (tecla D)"
    >
      {/* Los iconos giran y se intercambian; .theme-icon sigue animándose durante la View Transition */}
      <SunIcon
        aria-hidden
        className="theme-icon absolute size-4 scale-0 rotate-90 opacity-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:scale-100 dark:rotate-0 dark:opacity-100"
      />
      <MoonIcon
        aria-hidden
        className="theme-icon absolute size-4 scale-100 rotate-0 opacity-100 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:scale-0 dark:-rotate-90 dark:opacity-0"
      />
    </button>
  )
}
