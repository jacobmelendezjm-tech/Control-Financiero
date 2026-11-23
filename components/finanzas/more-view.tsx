"use client"

import * as React from "react"
import {
  DownloadIcon,
  ShareIcon,
  SquarePlusIcon,
} from "lucide-react"


import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { OrbeMark } from "@/components/finanzas/logo"
import { Orbi } from "@/components/finanzas/orbi"
import { AccountCard } from "@/components/finanzas/account-card"
import type { Cloud } from "@/hooks/use-cloud"
import type { Reminders } from "@/hooks/use-reminders"
import { RemindersCard } from "@/components/finanzas/reminders-card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Eyebrow } from "@/components/finanzas/kit"
import { MonedaPicker } from "@/components/finanzas/moneda-picker"
import type { Moneda } from "@/lib/finance"
import { LegalLinks } from "@/components/legal-links"

export type MoreGo = "movimientos" | "resumen" | "presupuesto" | "metas" | "hormiga" | "nominas" | "ajustes"


export function MoreView({
  nombre,
  moneda,
  onMoneda,
  pwa,
  onNombre,
  buddyOn,
  onBuddy,
  onTour,
  onProfile,
  cloud,
  reminders,
}: {
  nombre: string
  moneda: Moneda
  onMoneda: (m: Moneda) => void
  pwa: { canInstall: boolean; installed: boolean; ios: boolean; install: () => Promise<boolean> }
  onGo?: (v: MoreGo) => void
  onNombre: (n: string) => void
  buddyOn: boolean
  onBuddy: (on: boolean) => void
  onTour: () => void
  onProfile: () => void
  cloud: Cloud
  reminders: Reminders
}) {
  const [name, setName] = React.useState(nombre)

  return (
    <div className="view-in grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="grid min-w-0 gap-4">
        <div id="sec-cuenta" className="scroll-mt-24">
          <AccountCard cloud={cloud} />
        </div>
        <div id="sec-recordatorios" className="scroll-mt-24">
          <RemindersCard r={reminders} />
        </div>
      </div>

      <div className="grid min-w-0 gap-4">
        <section id="sec-orbi" className="relative scroll-mt-24 overflow-hidden rounded-[28px] bg-card p-5 ring-1 ring-foreground/8">
          <div aria-hidden className="absolute -right-6 -bottom-8 size-40 rounded-full bg-glow/15 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <Orbi mood="wave" className="w-20 shrink-0" />
            <div className="min-w-0">
              <p className="font-heading text-lg font-semibold">Orbi, tu copiloto</p>
              <p className="text-sm text-muted-foreground">Te guía, te da consejos y celebra tus logros.</p>
            </div>
          </div>
          <div className="relative mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={onProfile} variant="outline" className="h-11 rounded-2xl">
                Editar mi perfil
              </Button>
              <Button onClick={onTour} className="h-11 rounded-2xl">
                Ver el tutorial
              </Button>
            </div>
            <Label className="flex items-center gap-2.5 font-normal">
              <Checkbox checked={buddyOn} onCheckedChange={(v) => onBuddy(!!v)} />
              Mostrar a Orbi flotando en la app
            </Label>
          </div>
        </section>

        {!pwa.installed ? (
          <section id="sec-instalar" className="bg-hero-gradient relative scroll-mt-24 overflow-hidden rounded-[28px] p-5 text-hero-foreground">
            <div className="flex items-center gap-3">
              <OrbeMark className="size-14 rounded-2xl" />
              <div>
                <p className="font-heading text-lg font-semibold">Instala Orbe en tu móvil</p>
                <p className="text-sm text-hero-foreground/75">Se abre como una app, a pantalla completa y sin conexión.</p>
              </div>
            </div>
            {pwa.canInstall ? (
              <Button
                onClick={() => pwa.install()}
                className="mt-4 h-12 w-full rounded-2xl bg-gold text-[15px] font-semibold text-[#1f2b2d] hover:bg-gold/90"
              >
                <DownloadIcon className="size-5" /> Instalar app
              </Button>
            ) : pwa.ios ? (
              <ol className="mt-4 grid gap-2 text-sm text-hero-foreground/90">
                <li className="flex items-center gap-2">
                  1. Pulsa <ShareIcon className="size-4" /> <b>Compartir</b> en Safari
                </li>
                <li className="flex items-center gap-2">
                  2. Elige <SquarePlusIcon className="size-4" /> <b>Añadir a pantalla de inicio</b>
                </li>
              </ol>
            ) : (
              <p className="mt-4 text-sm text-hero-foreground/85">
                Abre el menú del navegador (⋮) y pulsa <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.
              </p>
            )}
          </section>
        ) : null}

        <Card>
          <CardContent className="grid gap-3">
            <Eyebrow>Tu nombre</Eyebrow>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                onNombre(name)
              }}
            >
              <Input
                aria-label="Tu nombre para el saludo"
                placeholder="¿Cómo te llamas?"
                maxLength={30}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" variant="outline">
                Guardar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card id="sec-moneda" className="scroll-mt-24">
          <CardContent className="grid gap-3">
            <Eyebrow>Moneda</Eyebrow>
            <p className="-mt-1 text-sm text-muted-foreground">
              En la que apuntas y ves todos tus importes. Cambiarla no convierte lo que ya tienes apuntado.
            </p>
            <MonedaPicker value={moneda} onChange={onMoneda} />
          </CardContent>
        </Card>

        <p className="px-1 text-center text-xs text-muted-foreground">
          {cloud.user
            ? "Tus datos se guardan en este dispositivo y en la nube."
            : "Tus datos se guardan solo en este dispositivo. Crea una cuenta o descarga una copia de vez en cuando desde Ajustes."}{" "}
          <a href="/privacidad" className="underline underline-offset-2">
            Privacidad
          </a>
        </p>
        <LegalLinks className="justify-items-center px-1 text-center [&_nav]:justify-center" />
      </div>
    </div>
  )
}
