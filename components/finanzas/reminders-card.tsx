"use client"

import { BellIcon, BellOffIcon, BellRingIcon, ShareIcon, SquarePlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/skeleton"
import { Eyebrow } from "@/components/finanzas/kit"
import type { Reminders } from "@/hooks/use-reminders"
import type { ReminderPrefs } from "@/lib/reminders"

const OPTIONS: { k: keyof ReminderPrefs; l: string; d: string }[] = [
  { k: "diario", l: "Resumen diario", d: "Para apuntar los gastos del día (no te aviso si ya has apuntado algo)" },
  { k: "fichar", l: "Fichar al acabar el turno", d: "Según tu horario, si aún no has registrado la jornada" },
  { k: "nomina", l: "Día de cobro", d: "Para apuntar la nómina el día que cobras" },
  { k: "fijos", l: "Gastos fijos", d: "El día que toca cada fijo" },
  { k: "semanal", l: "Resumen semanal", d: "Los domingos por la tarde" },
  { k: "nudge", l: "Si llevo días sin entrar", d: "Orbi te avisa si pasan 3 días sin abrir la app" },
]

function when(at: string) {
  const d = new Date(at)
  return d.toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function RemindersCard({ r }: { r: Reminders }) {
  if (r.support === "checking") return null
  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
            {r.on ? <BellRingIcon className="size-5" /> : <BellIcon className="size-5" />}
          </span>
          <div className="min-w-0">
            <p className="font-heading font-semibold">Recordatorios</p>
            <p className="text-sm text-muted-foreground">
              Notificaciones aunque no tengas la app abierta, para que no se te olvide controlar tus finanzas.
            </p>
          </div>
        </div>

        {r.support === "install-ios" ? (
          <div className="grid gap-1.5 rounded-2xl bg-muted/70 p-3 text-sm">
            <p>En iPhone, las notificaciones solo funcionan con Orbe instalada:</p>
            <p className="flex items-center gap-1.5">
              1. Pulsa <ShareIcon className="size-4" /> <b>Compartir</b> en Safari
            </p>
            <p className="flex items-center gap-1.5">
              2. <SquarePlusIcon className="size-4" /> <b>Añadir a pantalla de inicio</b> y abre Orbe desde ahí
            </p>
          </div>
        ) : r.support === "no-support" ? (
          <p className="rounded-2xl bg-muted/70 p-3 text-sm">Este navegador no admite notificaciones. Prueba con Chrome, Edge o Safari actualizados.</p>
        ) : r.support === "dev" ? (
          <p className="rounded-2xl bg-muted/70 p-3 text-sm">Las notificaciones funcionan en la app publicada (moneycare-five.vercel.app), no en modo desarrollo.</p>
        ) : !r.on ? (
          <Button className="h-11 rounded-2xl" disabled={r.busy} onClick={() => void r.enable()}>
            {r.busy ? <Spinner /> : <BellRingIcon />} Activar recordatorios
          </Button>
        ) : (
          <>
            <ul className="grid gap-2.5">
              {OPTIONS.map((o) => (
                <li key={o.k} className="grid gap-1.5">
                  <Label className="flex items-start gap-2.5 font-normal">
                    <Checkbox
                      checked={!!r.prefs[o.k]}
                      onCheckedChange={(v) => r.update({ [o.k]: !!v } as Partial<ReminderPrefs>)}
                      className="mt-0.5"
                    />
                    <span className="grid">
                      <span className="font-medium">{o.l}</span>
                      <span className="text-xs text-muted-foreground">{o.d}</span>
                    </span>
                  </Label>
                  {o.k === "diario" && r.prefs.diario ? (
                    <div className="ml-7 flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">A las</span>
                      <Input
                        type="time"
                        aria-label="Hora del resumen diario"
                        value={r.prefs.horaDiario}
                        onChange={(e) => e.target.value && r.update({ horaDiario: e.target.value })}
                        className="h-9 w-28"
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>

            {r.upcoming.length ? (
              <div className="grid gap-1 rounded-2xl bg-muted/60 p-3">
                <Eyebrow>Próximos avisos</Eyebrow>
                {r.upcoming.map((u) => (
                  <p key={u.id} className="text-sm">
                    <span className="text-muted-foreground first-letter:uppercase">{when(u.at)}</span> · {u.title}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => void r.test()}>
                <BellIcon /> Probar notificación
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" disabled={r.busy} onClick={() => void r.disable()}>
                {r.busy ? <Spinner /> : <BellOffIcon />} Desactivar
              </Button>
            </div>
          </>
        )}

        {r.error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {r.error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
