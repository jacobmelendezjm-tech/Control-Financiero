"use client"

import * as React from "react"
import {
  ChevronLeftIcon,
  CloudIcon,
  LoaderCircleIcon,
  SmartphoneIcon,
} from "lucide-react"

import { LoginForm } from "@/components/finanzas/account-card"
import { OrbeMark } from "@/components/finanzas/logo"
import { Orbi } from "@/components/finanzas/orbi"
import { SilkShader } from "@/components/silk-shader"
import type { Cloud } from "@/hooks/use-cloud"
import { readPendingLogin } from "@/lib/pending-login"

/**
 * Pantalla de entrada: la app queda detrás hasta elegir «Iniciar sesión» o «Continuar sin cuenta».
 * Sale al abrir sin sesión (si no se eligió antes «sin cuenta») y siempre al cerrar sesión.
 */
export function LoginGate({
  cloud,
  onLocal,
}: {
  cloud: Cloud
  onLocal: () => void
}) {
  // Si se salió a copiar el código del correo, se vuelve directo al formulario.
  const [modo, setModo] = React.useState<"elegir" | "cuenta">(() =>
    readPendingLogin() ? "cuenta" : "elegir"
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      data-lenis-prevent
      className="fixed inset-0 z-[80] overflow-y-auto bg-[#0f1a1c] text-white"
    >
      <div aria-hidden className="fixed inset-0">
        <SilkShader lite className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1a1c]/55 via-[#0f1a1c]/70 to-[#0f1a1c]/95" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-safe pb-safe">
        <header className="flex items-center gap-2.5 pt-6">
          <OrbeMark className="size-9" />
          <span className="grid leading-none">
            <span className="font-heading text-xl font-semibold tracking-tight">
              Orbe
            </span>
            <span className="mt-1 text-[9px] font-semibold tracking-[0.28em] text-[#8ff6ff]/85">
              CONTROL FINANCIERO
            </span>
          </span>
        </header>

        <div className="grid flex-1 content-center gap-7 py-8">
          <div className="grid justify-items-center gap-4 text-center">
            <Orbi
              mood="wave"
              className="orbi-float w-28 drop-shadow-[0_16px_30px_rgb(0_0_0/0.45)]"
            />
            <div className="grid gap-2">
              <h1
                id="gate-title"
                className="font-heading text-3xl font-semibold tracking-tight"
              >
                {modo === "cuenta"
                  ? "Entra con tu correo"
                  : "Bienvenido a Orbe"}
              </h1>
              <p className="text-[15px] text-white/75">
                {modo === "cuenta"
                  ? "Te envío un código. Sin contraseñas: tus datos, a salvo en la nube y en todos tus dispositivos."
                  : "Tu dinero y tus turnos, en un solo sitio. ¿Cómo quieres empezar?"}
              </p>
            </div>
          </div>

          {!cloud.authReady ? (
            <p className="flex items-center justify-center gap-2 text-sm text-white/70">
              <LoaderCircleIcon className="size-4 animate-spin" /> Comprobando
              tu sesión…
            </p>
          ) : modo === "elegir" ? (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setModo("cuenta")}
                className="flex items-center gap-3.5 rounded-3xl bg-[#f2b84b] px-5 py-4 text-left text-[#1f2b2d] shadow-[0_14px_32px_-10px_rgb(242_184_75/0.6)] transition-transform active:scale-[0.98]"
              >
                <CloudIcon className="size-6 shrink-0" />
                <span className="grid">
                  <span className="font-heading text-[17px] font-semibold">
                    Iniciar sesión o crear cuenta
                  </span>
                  <span className="text-[13px] text-[#1f2b2d]/75">
                    Con tu correo. Tus datos, siempre a salvo.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={onLocal}
                className="flex items-center gap-3.5 rounded-3xl bg-white/[0.07] px-5 py-4 text-left ring-1 ring-white/15 transition-colors hover:bg-white/[0.11] active:scale-[0.98]"
              >
                <SmartphoneIcon className="size-6 shrink-0 text-[#8ff6ff]" />
                <span className="grid">
                  <span className="font-heading text-[17px] font-semibold">
                    Continuar sin cuenta
                  </span>
                  <span className="text-[13px] text-white/65">
                    Todo se guarda solo en este dispositivo.
                  </span>
                </span>
              </button>
            </div>
          ) : (
            <div className="grid gap-3 rounded-3xl bg-card p-5 text-card-foreground shadow-2xl">
              <LoginForm cloud={cloud} />
              <button
                type="button"
                onClick={() => setModo("elegir")}
                className="inline-flex items-center gap-1 justify-self-start text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeftIcon className="size-4" /> Volver
              </button>
            </div>
          )}
        </div>

        <p className="pb-6 text-center text-xs text-white/55">
          Al continuar aceptas los{" "}
          <a
            href="/terminos"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-2"
          >
            Términos de uso
          </a>{" "}
          y la{" "}
          <a
            href="/privacidad"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-2"
          >
            Política de privacidad
          </a>
          .
        </p>
      </div>
    </div>
  )
}
