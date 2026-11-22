"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

import { useThemeSwitch, visibleThemeToggle } from "@/lib/theme-transition"

const THEME_COLOR = { light: "#e9f6f6", dark: "#172123" } as const

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // La animación del cambio la gestiona useThemeSwitch (lib/theme-transition)
      disableTransitionOnChange={false}
      {...props}
    >
      <ThemeHotkey />
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

/** Tecla "d": alterna el tema con la misma animación que el botón. */
function ThemeHotkey() {
  const switchTheme = useThemeSwitch()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      switchTheme(visibleThemeToggle())
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [switchTheme])

  return null
}

/** Ajusta el color de la barra del navegador móvil al tema elegido. */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute("content", THEME_COLOR[resolvedTheme]))
  }, [resolvedTheme])

  return null
}

export { ThemeProvider }
