"use client"

import * as React from "react"
import Link from "next/link"
import { CheckIcon, DownloadIcon, MonitorIcon, Share2Icon, SmartphoneIcon } from "lucide-react"

import { usePwa } from "@/hooks/use-pwa"
import { cn } from "@/lib/utils"

type Plataforma = "android" | "ios" | "escritorio"

const PASOS: Record<Plataforma, { titulo: string; icono: typeof SmartphoneIcon; pasos: React.ReactNode[] }> = {
  android: {
    titulo: "Android",
    icono: SmartphoneIcon,
    pasos: [
      <>Abre este enlace en <b>Chrome</b>.</>,
      <>Toca <b>Instalar</b> arriba, o el menú <b>⋮</b> › <b>Instalar aplicación</b>.</>,
      <>Orbe aparece en tu pantalla de inicio, como cualquier app.</>,
    ],
  },
  ios: {
    titulo: "iPhone",
    icono: SmartphoneIcon,
    pasos: [
      <>Abre este enlace en <b>Safari</b>.</>,
      <>Toca <b>Compartir</b> (el cuadrado con la flecha) › <b>Añadir a pantalla de inicio</b>.</>,
      <>Toca <b>Añadir</b> y abre Orbe desde su icono.</>,
    ],
  },
  escritorio: {
    titulo: "Ordenador",
    icono: MonitorIcon,
    pasos: [
      <>Abre este enlace en <b>Chrome</b> o <b>Edge</b>.</>,
      <>Pulsa <b>Instalar</b> arriba, o el icono de instalar en la barra de direcciones.</>,
      <>Orbe se abre en su propia ventana.</>,
    ],
  },
}

/** Botón para instalar Orbe (PWA), pasos según el dispositivo y botón para compartir el enlace. */
export function InstallCard() {
  const pwa = usePwa()
  const [plat, setPlat] = React.useState<Plataforma>("android")
  const [copiado, setCopiado] = React.useState(false)

  React.useEffect(() => {
    const ua = navigator.userAgent
    // Solo se sabe en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlat(/iphone|ipad|ipod/i.test(ua) ? "ios" : /android/i.test(ua) ? "android" : "escritorio")
  }, [])

  const compartir = async () => {
    const url = `${location.origin}/descargar`
    const datos = { title: "Orbe", text: "Mira esta app para controlar tu dinero y tus turnos:", url }
    try {
      if (navigator.share) return await navigator.share(datos)
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {}
  }

  const p = PASOS[plat]
  return (
    <div className="mt-8 grid max-w-xl gap-4">
      <div className="flex flex-wrap gap-3">
        {pwa.installed ? (
          <Link href="/" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f2b84b] px-6 font-semibold text-[#1f2b2d]">
            <CheckIcon className="size-5" /> Ya la tienes · Abrir Orbe
          </Link>
        ) : pwa.canInstall ? (
          <button
            type="button"
            onClick={() => void pwa.install()}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f2b84b] px-6 font-semibold text-[#1f2b2d] shadow-[0_12px_30px_-8px_rgb(242_184_75/0.6)] transition-transform active:scale-[0.98]"
          >
            <DownloadIcon className="size-5" /> Instalar Orbe gratis
          </button>
        ) : (
          <Link
            href="/"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f2b84b] px-6 font-semibold text-[#1f2b2d] shadow-[0_12px_30px_-8px_rgb(242_184_75/0.6)]"
          >
            Abrir Orbe gratis
          </Link>
        )}
        <button
          type="button"
          onClick={() => void compartir()}
          className="inline-flex h-12 items-center gap-2 rounded-full px-5 font-medium text-white ring-1 ring-white/30 transition-colors hover:bg-white/10"
        >
          {copiado ? <CheckIcon className="size-5" /> : <Share2Icon className="size-5" />}
          {copiado ? "Enlace copiado" : "Compartir"}
        </button>
      </div>

      {pwa.installed ? null : (
        <div className="rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10">
          <div role="tablist" aria-label="Tu dispositivo" className="mb-4 flex gap-1 rounded-full bg-black/25 p-1">
            {(Object.keys(PASOS) as Plataforma[]).map((k) => {
              const Icono = PASOS[k].icono
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={plat === k}
                  onClick={() => setPlat(k)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors",
                    plat === k ? "bg-white text-[#1f2b2d]" : "text-white/75 hover:text-white"
                  )}
                >
                  <Icono className="size-4" /> {PASOS[k].titulo}
                </button>
              )
            })}
          </div>
          <ol className="grid gap-2.5 text-sm text-white/85">
            {p.pasos.map((paso, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#12b2c1]/25 text-xs font-semibold text-[#8ff6ff]">
                  {i + 1}
                </span>
                <span>{paso}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-white/55">No ocupa casi espacio, funciona sin conexión y se actualiza sola.</p>
        </div>
      )}
    </div>
  )
}
