"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import {
  BellIcon,
  BugIcon,
  ChartPieIcon,
  ChevronRightIcon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  HouseIcon,
  LifeBuoyIcon,
  ListIcon,
  MoonIcon,
  PiggyBankIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  SunIcon,
  TargetIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react"
import { useTheme } from "next-themes"

import { CloudBadge } from "@/components/finanzas/cloud-badge"
import { OrbeWordmark } from "@/components/finanzas/logo"
import type { CloudStatus } from "@/hooks/use-cloud"
import { useThemeSwitch } from "@/lib/theme-transition"
import { cn } from "@/lib/utils"

type Go =
  | "inicio"
  | "resumen"
  | "movimientos"
  | "presupuesto"
  | "metas"
  | "hormiga"
  | "trabajo"
  | "nominas"
  | "ajustes"

export type MenuSection = "cuenta" | "recordatorios" | "orbi" | "instalar"

function Row({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
  right,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint?: string
  active?: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  right?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] transition-colors hover:bg-muted",
        active && "bg-secondary font-semibold"
      )}
    >
      <Icon className={cn("size-[18px] shrink-0 text-muted-foreground", active && "text-primary")} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {hint ? <span className="block truncate text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      {right ?? <ChevronRightIcon className="size-4 text-muted-foreground/60" />}
    </button>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  )
}

/** Menú lateral desplegable (tres rayas): todo ordenado en pocos grupos. */
export function SideMenu({
  open,
  onOpenChange,
  view,
  name,
  email,
  cloud,
  canInstall,
  onGo,
  onSection,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  view: string
  name: string
  email: string | null
  cloud: CloudStatus | null
  canInstall: boolean
  onGo: (v: Go) => void
  onSection: (s: MenuSection) => void
}) {
  const { resolvedTheme } = useTheme()
  const switchTheme = useThemeSwitch()
  const go = (v: Go) => () => {
    onOpenChange(false)
    onGo(v)
  }
  const section = (s: MenuSection) => () => {
    onOpenChange(false)
    onSection(s)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          data-lenis-prevent
          className="pt-safe pb-safe fixed inset-y-0 right-0 z-50 flex w-[min(340px,88vw)] flex-col bg-card shadow-2xl ring-1 ring-foreground/10 outline-none duration-300 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <DialogPrimitive.Title render={<div />}>
              <OrbeWordmark />
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="grid size-10 place-items-center rounded-full hover:bg-muted" aria-label="Cerrar menú">
              <XIcon className="size-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Cuenta */}
          <button
            type="button"
            onClick={section("cuenta")}
            className="mx-3 mb-2 flex items-center gap-3 rounded-2xl bg-muted/70 p-3 text-left hover:bg-muted"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-hero font-heading text-lg font-semibold text-hero-foreground">
              {name ? name.charAt(0).toUpperCase() : <UserRoundIcon className="size-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{name || "Tu cuenta"}</span>
              <span className="block truncate text-xs text-muted-foreground">{email || "Sin cuenta · solo en este dispositivo"}</span>
            </span>
            <CloudBadge status={cloud} />
          </button>

          <nav className="grid flex-1 content-start gap-4 overflow-y-auto overscroll-contain px-2 pb-3" aria-label="Menú">
            <Group title="Tu dinero">
              <Row icon={HouseIcon} label="Inicio" active={view === "inicio"} onClick={go("inicio")} />
              <Row icon={ListIcon} label="Movimientos" active={view === "movimientos"} onClick={go("movimientos")} />
              <Row icon={ChartPieIcon} label="Análisis" active={view === "resumen"} onClick={go("resumen")} />
              <Row icon={TargetIcon} label="Presupuestos" active={view === "presupuesto"} onClick={go("presupuesto")} />
              <Row icon={PiggyBankIcon} label="Ahorro y metas" active={view === "metas"} onClick={go("metas")} />
              <Row icon={BugIcon} label="Gastos hormiga" active={view === "hormiga"} onClick={go("hormiga")} />
            </Group>
            <Group title="Trabajo">
              <Row icon={ClockIcon} label="Horario y jornadas" active={view === "trabajo"} onClick={go("trabajo")} />
              <Row icon={FileTextIcon} label="Nóminas" active={view === "nominas"} onClick={go("nominas")} />
            </Group>
            <Group title="App">
              <Row icon={UserRoundIcon} label="Cuenta y nube" onClick={section("cuenta")} />
              <Row icon={BellIcon} label="Recordatorios" onClick={section("recordatorios")} />
              <Row icon={SparklesIcon} label="Orbi y tutorial" onClick={section("orbi")} />
              {canInstall ? <Row icon={DownloadIcon} label="Instalar la app" onClick={section("instalar")} /> : null}
              <Row
                icon={resolvedTheme === "dark" ? SunIcon : MoonIcon}
                label={resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro"}
                onClick={(e) => switchTheme(e.currentTarget)}
                right={<span />}
              />
              <Row icon={SlidersHorizontalIcon} label="Ajustes y copias" active={view === "ajustes"} onClick={go("ajustes")} />
            </Group>
          </nav>

          <div className="flex items-center gap-4 border-t px-5 py-3 text-sm text-muted-foreground">
            <a href="/privacidad" className="flex items-center gap-1.5 hover:text-foreground">
              <ShieldIcon className="size-4" /> Privacidad
            </a>
            <a href="mailto:soporte.moneycare.orbe@gmail.com" className="flex items-center gap-1.5 hover:text-foreground">
              <LifeBuoyIcon className="size-4" /> Ayuda
            </a>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
