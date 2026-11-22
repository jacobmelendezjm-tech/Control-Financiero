"use client"

import * as React from "react"
import {
  BugIcon,
  ChartPieIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileTextIcon,
  ListIcon,
  MoonIcon,
  PiggyBankIcon,
  ShareIcon,
  SlidersHorizontalIcon,
  SquarePlusIcon,
  SunIcon,
  TargetIcon,
} from "lucide-react"
import { useTheme } from "next-themes"

import { useThemeSwitch } from "@/lib/theme-transition"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { OrbeMark } from "@/components/finanzas/logo"
import { Orbi } from "@/components/finanzas/orbi"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Eyebrow } from "@/components/finanzas/kit"

export type MoreGo = "movimientos" | "resumen" | "presupuesto" | "metas" | "hormiga" | "nominas" | "ajustes"

const TILES: { v: MoreGo; label: string; sub: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { v: "movimientos", label: "Movimientos", sub: "Busca y filtra todo", Icon: ListIcon },
  { v: "resumen", label: "Análisis", sub: "50/30/20 y 6 meses", Icon: ChartPieIcon },
  { v: "presupuesto", label: "Presupuestos", sub: "Límites por categoría", Icon: TargetIcon },
  { v: "metas", label: "Ahorro y metas", sub: "Huchas con objetivo", Icon: PiggyBankIcon },
  { v: "hormiga", label: "Gastos hormiga", sub: "Los pequeños que suman", Icon: BugIcon },
  { v: "nominas", label: "Nóminas", sub: "Neto, bruto e IRPF", Icon: FileTextIcon },
]

export function MoreView({
  nombre,
  pwa,
  onGo,
  onNombre,
  buddyOn,
  onBuddy,
  onTour,
  onProfile,
}: {
  nombre: string
  pwa: { canInstall: boolean; installed: boolean; ios: boolean; install: () => Promise<boolean> }
  onGo: (v: MoreGo) => void
  onNombre: (n: string) => void
  buddyOn: boolean
  onBuddy: (on: boolean) => void
  onTour: () => void
  onProfile: () => void
}) {
  const { resolvedTheme } = useTheme()
  const switchTheme = useThemeSwitch()
  const [name, setName] = React.useState(nombre)

  return (
    <div className="view-in grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="grid min-w-0 gap-4">
        <div className="grid grid-cols-2 gap-3">
          {TILES.map(({ v, label, sub, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => onGo(v)}
              className="grid gap-3 rounded-3xl bg-card p-4 text-left ring-1 ring-foreground/8 transition-transform active:scale-[0.98]"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">{sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-4">
        <section className="relative overflow-hidden rounded-[28px] bg-card p-5 ring-1 ring-foreground/8">
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
          <section className="bg-hero-gradient relative overflow-hidden rounded-[28px] p-5 text-hero-foreground">
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

        <Card className="py-1">
          <button
            type="button"
            onClick={(e) => switchTheme(e.currentTarget)}
            className="flex items-center gap-3 px-4 py-3 text-left"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-secondary">
              <SunIcon className="hidden size-5 dark:block" />
              <MoonIcon className="size-5 dark:hidden" />
            </span>
            <span className="flex-1 font-medium">Modo {resolvedTheme === "dark" ? "claro" : "oscuro"}</span>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </button>
          <button type="button" onClick={() => onGo("ajustes")} className="flex items-center gap-3 border-t px-4 py-3 text-left">
            <span className="grid size-10 place-items-center rounded-xl bg-secondary">
              <SlidersHorizontalIcon className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-medium">Ajustes y copias</span>
              <span className="block text-xs text-muted-foreground">Categorías, fijos, saldo inicial, exportar e importar</span>
            </span>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </button>
        </Card>
        <p className="px-1 text-center text-xs text-muted-foreground">
          Tus datos se guardan solo en este dispositivo. Descarga una copia de vez en cuando desde Ajustes.
        </p>
      </div>
    </div>
  )
}
