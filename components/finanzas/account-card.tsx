"use client"

import * as React from "react"
import { toast } from "sonner"
import { CloudCheckIcon, CloudIcon, CloudOffIcon, LoaderCircleIcon, MailCheckIcon, MailIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Eyebrow } from "@/components/finanzas/kit"
import { Spinner } from "@/components/ui/skeleton"
import type { Cloud, CloudStatus } from "@/hooks/use-cloud"
import { cn } from "@/lib/utils"

export const STATUS_TEXT: Record<CloudStatus, string> = {
  off: "Solo en este dispositivo",
  syncing: "Sincronizando…",
  synced: "Guardado en la nube",
  pending: "Cambios por subir",
  offline: "Sin conexión: se subirá al volver",
  error: "No se ha podido sincronizar",
  setup: "La nube aún no está preparada",
}

function since(iso: string | null) {
  if (!iso) return ""
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "hace un momento"
  if (s < 3600) return `hace ${Math.round(s / 60)} min`
  return new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

/** Aviso emergente: el correo con el código ya va de camino. */
export function mailSentToast(email: string) {
  toast.success("¡Correo enviado!", {
    description: `Te hemos enviado un código a ${email}. Puede tardar un minuto; mira también en spam o promociones.`,
    icon: <MailCheckIcon className="size-5 text-primary" />,
    duration: 7000,
  })
}

/** Cuenta opcional: inicio de sesión con código por correo y sincronización. */
export function AccountCard({ cloud }: { cloud: Cloud }) {
  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [step, setStep] = React.useState<"email" | "code">("email")
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState("")
  const [ask, setAsk] = React.useState<null | "logout" | "delete">(null)

  if (!cloud.enabled) return null

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const v = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setMsg("Escribe un correo válido.")
    setBusy(true)
    setMsg("")
    const err = await cloud.sendCode(v)
    setBusy(false)
    if (err) return setMsg(err)
    setEmail(v)
    setStep("code")
    mailSentToast(v)
  }
  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{6,10}$/.test(code.trim())) return setMsg("Escribe el código que te ha llegado por correo.")
    setBusy(true)
    setMsg("")
    const err = await cloud.verifyCode(email, code)
    setBusy(false)
    if (err) return setMsg(err)
    setCode("")
    setStep("email")
  }

  if (!cloud.authReady)
    return (
      <Card>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" /> Comprobando tu cuenta…
        </CardContent>
      </Card>
    )

  if (cloud.user) {
    const s = cloud.status
    const Icon = s === "synced" ? CloudCheckIcon : s === "syncing" ? LoaderCircleIcon : s === "off" ? CloudIcon : CloudOffIcon
    return (
      <Card>
        <CardContent className="grid gap-3">
          <Eyebrow>Tu cuenta</Eyebrow>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-2xl",
                s === "synced" ? "bg-good/15 text-good" : s === "error" || s === "setup" ? "bg-bad/12 text-bad" : "bg-secondary text-primary"
              )}
            >
              <Icon className={cn("size-5", s === "syncing" && "animate-spin")} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{cloud.user.email}</p>
              <p className="text-xs text-muted-foreground" role="status">
                {STATUS_TEXT[s]}
                {s === "synced" && cloud.lastSync ? ` · ${since(cloud.lastSync)}` : ""}
              </p>
            </div>
          </div>
          {(s === "error" || s === "setup") && cloud.lastError ? (
            <p role="alert" className="rounded-xl bg-bad/10 px-3 py-2 text-xs text-bad">
              No se pudo guardar en la nube: {cloud.lastError}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Tus datos se guardan en este dispositivo y una copia en la nube. Entra con este correo en otro móvil u ordenador y los
            tendrás allí.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => void cloud.syncNow()} disabled={s === "syncing"}>
              <RefreshCwIcon /> {s === "error" || s === "setup" ? "Reintentar" : "Sincronizar ahora"}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setAsk("logout")}>
              Cerrar sesión
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => setAsk("delete")}>
              Borrar mi cuenta
            </Button>
          </div>
          <a href="/privacidad" className="text-xs text-muted-foreground underline underline-offset-2">
            Privacidad y uso de tus datos
          </a>
        </CardContent>
        <AccountDialogs ask={ask} setAsk={setAsk} cloud={cloud} />
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
            <CloudIcon className="size-5" />
          </span>
          <div>
            <p className="font-heading font-semibold">Guarda tus datos en la nube</p>
            <p className="text-sm text-muted-foreground">
              Opcional. Con tu correo no pierdes nada si cambias de móvil y puedes usar Orbe en varios dispositivos. Sin contraseñas.
            </p>
          </div>
        </div>
        {step === "email" ? (
          <form onSubmit={send} noValidate className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-label="Tu correo electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" disabled={busy} className="shrink-0">
              {busy ? <LoaderCircleIcon className="animate-spin" /> : <MailIcon />} Enviarme un código
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} noValidate className="grid gap-2">
            <p className="text-sm">
              Te he enviado un código a <b>{email}</b>. Escríbelo aquí, o abre el correo en este mismo dispositivo y pulsa
              «Entrar en Orbe».
              <span className="mt-1 block text-xs text-muted-foreground">Puede tardar un minuto. Mira también en spam.</span>
            </p>
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Código del correo"
                placeholder="Código"
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="font-heading text-lg tracking-[0.3em]"
              />
              <Button type="submit" disabled={busy} className="shrink-0">
                {busy ? <LoaderCircleIcon className="animate-spin" /> : null} Entrar
              </Button>
            </div>
            <div className="flex gap-3 text-xs">
              <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => void send()}>
                Reenviar el código
              </button>
              <button
                type="button"
                className="text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => {
                  setStep("email")
                  setMsg("")
                }}
              >
                Cambiar de correo
              </button>
            </div>
          </form>
        )}
        {msg ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {msg}
          </p>
        ) : null}
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldCheckIcon className="mt-px size-3.5 shrink-0" />
          <span>
            Solo tú puedes ver tus datos. Puedes borrar tu cuenta cuando quieras.{" "}
            <a href="/privacidad" className="underline underline-offset-2">
              Privacidad
            </a>
          </span>
        </p>
      </CardContent>
    </Card>
  )
}

function AccountDialogs({ ask, setAsk, cloud }: { ask: null | "logout" | "delete"; setAsk: (v: null | "logout" | "delete") => void; cloud: Cloud }) {
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState("")
  const close = () => {
    setAsk(null)
    setErr("")
  }
  return (
    <Dialog open={!!ask} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        {ask === "logout" ? (
          <>
            <DialogHeader>
              <DialogTitle>Cerrar sesión</DialogTitle>
              <DialogDescription>
                Tus datos siguen guardados en la nube. ¿Quieres dejarlos también en este dispositivo? Si no es tu móvil, mejor bórralos de aquí.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:flex-col">
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  await cloud.signOut(false)
                  setBusy(false)
                  close()
                }}
              >
                {busy ? <Spinner /> : null} Cerrar sesión y mantenerlos aquí
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  await cloud.signOut(true)
                  setBusy(false)
                  close()
                }}
              >
                {busy ? <Spinner /> : null} Cerrar sesión y borrarlos de este dispositivo
              </Button>
            </DialogFooter>
          </>
        ) : ask === "delete" ? (
          <>
            <DialogHeader>
              <DialogTitle>¿Borrar tu cuenta?</DialogTitle>
              <DialogDescription>
                Se borrarán tu cuenta y todos tus datos de la nube. No se puede deshacer. Los datos de este dispositivo se quedan aquí
                hasta que los borres en Ajustes.
              </DialogDescription>
            </DialogHeader>
            {err ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {err}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  const e = await cloud.deleteAccount()
                  setBusy(false)
                  if (e) return setErr(e)
                  close()
                }}
              >
                {busy ? <Spinner /> : null} Sí, borrar mi cuenta
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** Cuando la nube y el dispositivo tienen datos distintos: elegir cuáles conservar. */
export function ConflictDialog({ cloud }: { cloud: Cloud }) {
  const c = cloud.conflict
  if (!c) return null
  const n = (d: typeof c.data) => Object.values(d.months).reduce((a, x) => a + x.length, 0)
  const text =
    c.reason === "otra-cuenta"
      ? "Este dispositivo tiene datos de otra cuenta y tu cuenta ya tiene datos en la nube."
      : c.reason === "primera-vez"
        ? "Ya tenías datos en la nube y también en este dispositivo."
        : "Has hecho cambios aquí y en otro dispositivo a la vez."
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>¿Qué datos quieres conservar?</DialogTitle>
          <DialogDescription>{text} Elige cuáles se quedan; los otros se sustituyen.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button className="h-auto justify-start rounded-2xl py-3 text-left" onClick={() => void cloud.resolve("nube")}>
            <span className="grid">
              <span>Los de la nube</span>
              <span className="text-xs font-normal opacity-80">
                {n(c.data)} movimientos · guardados {new Date(c.at).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </span>
          </Button>
          <Button variant="outline" className="h-auto justify-start rounded-2xl py-3 text-left" onClick={() => void cloud.resolve("dispositivo")}>
            <span className="grid">
              <span>Los de este dispositivo</span>
              <span className="text-xs font-normal text-muted-foreground">Sustituyen a los de la nube</span>
            </span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Consejo: si dudas, descarga antes una copia completa desde Ajustes.</p>
      </DialogContent>
    </Dialog>
  )
}
