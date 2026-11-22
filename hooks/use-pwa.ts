"use client"

import * as React from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/** Registra el service worker (solo en producción) y expone la instalación. */
export function usePwa() {
  const [prompt, setPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = React.useState(false)
  const [ios, setIos] = React.useState(false)

  React.useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    // Estado que solo se conoce en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalled(standalone)
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent))

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {})
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = React.useCallback(async () => {
    if (!prompt) return false
    await prompt.prompt()
    const r = await prompt.userChoice
    setPrompt(null)
    return r.outcome === "accepted"
  }, [prompt])

  return { canInstall: !!prompt, installed, ios, install }
}
