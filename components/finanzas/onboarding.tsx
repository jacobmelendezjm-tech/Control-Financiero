"use client"

import * as React from "react"
import { CloudIcon, SmartphoneIcon, TriangleAlertIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Orbi, type OrbiMood } from "@/components/finanzas/orbi"
import { Spinner } from "@/components/ui/skeleton"
import { mailSentToast } from "@/components/finanzas/account-card"
import { eur, fmtPlain, parseMoney, parsePos, type Cobro, type FinanceData, type Objetivo } from "@/lib/finance"
import { cn } from "@/lib/utils"

export interface OnboardAnswers {
  nombre: string
  cobro?: Cobro
  neto?: number
  diaCobro?: number
  recordar: boolean
  precioHora?: number
  precioExtra?: number
  horasDia?: number
  ini?: string
  fin?: string
  saldo?: number
  objetivo?: Objetivo
  ahorroMes?: number
  metaNombre?: string
  metaObj?: number
}

type StepId = "hola" | "nombre" | "cobro" | "sueldo" | "jornada" | "saldo" | "objetivo" | "cuenta" | "listo"

/** Lo que el formulario necesita de la cuenta (hooks/use-cloud). */
export interface OnboardCloud {
  enabled: boolean
  signedIn: boolean
  sendCode: (email: string) => Promise<string | null>
  verifyCode: (email: string, code: string) => Promise<string | null>
}

const COBROS: { v: Cobro; l: string; d: string }[] = [
  { v: "fija", l: "Nómina mensual", d: "Cobro cada mes; puede variar un poco" },
  { v: "horas", l: "Por horas", d: "Cobro según las horas que hago" },
  { v: "autonomo", l: "Autónomo", d: "Facturo por mi cuenta" },
  { v: "no", l: "Ahora no trabajo", d: "Estudio, busco trabajo…" },
]
const OBJETIVOS: { v: Objetivo; l: string; e: string }[] = [
  { v: "ahorrar", l: "Ahorrar para algo", e: "🎯" },
  { v: "emergencia", l: "Fondo de emergencia", e: "🛟" },
  { v: "controlar", l: "Gastar menos", e: "✂️" },
  { v: "deudas", l: "Pagar deudas", e: "🧾" },
  { v: "saber", l: "Saber en qué gasto", e: "🔍" },
]

/** Formulario de bienvenida: una pregunta por paso, todas opcionales. */
export function Onboarding({
  open,
  data,
  onFinish,
  onLater,
  onLocal,
  cloud,
  accountOnly = false,
}: {
  open: boolean
  data: FinanceData
  onFinish: (a: OnboardAnswers, tour: boolean) => void
  onLater: () => void
  /** Eligió «Seguir sin cuenta»: no se vuelve a preguntar al abrir. */
  onLocal: () => void
  cloud?: OnboardCloud
  /** Solo la pregunta de la cuenta (el perfil ya está hecho). */
  accountOnly?: boolean
}) {
  const p = data.settings.perfil || {}
  const cfg = data.work.cfg
  // Se decide al abrir: si ya hay sesión, no se pregunta.
  const [askAccount] = React.useState(() => !!cloud?.enabled && !cloud.signedIn)
  const [step, setStep] = React.useState<StepId>(() => (askAccount || accountOnly ? "cuenta" : "hola"))
  const [nombre, setNombre] = React.useState(data.settings.nombre || "")
  const [cobro, setCobro] = React.useState<Cobro | undefined>(p.cobro)
  const [neto, setNeto] = React.useState(p.neto ? fmtPlain(p.neto) : "")
  const [dia, setDia] = React.useState(String(p.diaCobro || ""))
  const [recordar, setRecordar] = React.useState(!data.settings.recs.some((r) => r.cat === "nomina"))
  const [ph, setPh] = React.useState(cfg.precioHora ? fmtPlain(cfg.precioHora) : "")
  const [pe, setPe] = React.useState(cfg.precioExtra ? fmtPlain(cfg.precioExtra) : "")
  const [hd, setHd] = React.useState(String(cfg.horasDia).replace(".", ","))
  const [ini, setIni] = React.useState(cfg.ini)
  const [fin, setFin] = React.useState(cfg.fin)
  const [saldo, setSaldo] = React.useState("")
  const [objetivo, setObjetivo] = React.useState<Objetivo | undefined>(p.objetivo)
  const [ahorro, setAhorro] = React.useState(p.ahorroMes ? fmtPlain(p.ahorroMes) : "")
  const [metaN, setMetaN] = React.useState("")
  const [metaO, setMetaO] = React.useState("")
  // Paso «cuenta»: crear cuenta con el correo o seguir solo en el dispositivo.
  const [modo, setModo] = React.useState<"nube" | "local" | null>(null)
  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [codeSent, setCodeSent] = React.useState(false)
  const [verified, setVerified] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState("")
  const panelRef = React.useRef<HTMLDivElement>(null)

  const works = cobro === "fija" || cobro === "horas"
  const flow: StepId[] = accountOnly
    ? ["cuenta"]
    : [
    // Lo primero al abrir: entrar con tu cuenta o seguir sin ella.
    ...(askAccount ? (["cuenta"] as StepId[]) : []),
    "hola",
    "nombre",
    "cobro",
    ...(cobro && cobro !== "no" ? (["sueldo"] as StepId[]) : []),
    ...(works ? (["jornada"] as StepId[]) : []),
    "saldo",
    "objetivo",
    "listo",
  ]
  const idx = flow.indexOf(step)
  const questions: StepId[] = flow.filter((s) => s !== "hola" && s !== "listo" && s !== "cuenta")
  const qIdx = questions.indexOf(step)

  // Foco al primer campo o botón de cada paso.
  React.useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], input, [data-primary]")
      el?.focus({ preventScroll: true })
    }, 320)
    return () => clearTimeout(t)
  }, [open, step])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onLater()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onLater])

  const netoC = neto.trim() ? parsePos(neto) : undefined
  const ahorroSugerido = netoC ? Math.round(netoC * 0.2 / 500) * 500 : 0

  const answers = (): OnboardAnswers => ({
    nombre: nombre.trim().slice(0, 30),
    cobro,
    neto: netoC || undefined,
    diaCobro: dia.trim() ? Math.min(31, Math.max(1, Math.round(Number(dia)) || 1)) : undefined,
    recordar,
    precioHora: ph.trim() ? parsePos(ph) || undefined : undefined,
    precioExtra: pe.trim() ? parsePos(pe) || undefined : undefined,
    horasDia: hd.trim() ? (parseMoney(hd) ?? 0) / 100 || undefined : undefined,
    ini,
    fin,
    saldo: saldo.trim() ? (parseMoney(saldo) ?? undefined) : undefined,
    objetivo,
    ahorroMes: ahorro.trim() ? parsePos(ahorro) || undefined : undefined,
    metaNombre: metaN.trim().slice(0, 40) || undefined,
    metaObj: metaO.trim() ? parsePos(metaO) || undefined : undefined,
  })

  function validate(): string {
    if (step === "sueldo") {
      if (neto.trim() && !parsePos(neto)) return "Escribe un importe válido, por ejemplo 880."
      if (dia.trim() && !(Number(dia) >= 1 && Number(dia) <= 31)) return "El día de cobro va del 1 al 31."
      if (ph.trim() && !parsePos(ph)) return "Revisa el precio por hora."
    }
    if (step === "jornada") {
      const h = (parseMoney(hd) ?? 0) / 100
      if (hd.trim() && !(h > 0 && h <= 24)) return "Las horas al día van de 0 a 24."
    }
    if (step === "saldo" && saldo.trim() && parseMoney(saldo) == null) return "Escribe un importe válido, por ejemplo 450."
    if (step === "cuenta" && !modo && !verified) return "Elige una de las dos opciones."
    if (step === "cuenta" && modo === "nube" && !verified)
      return "Termina de verificar tu correo o elige «Seguir sin cuenta»."
    if (step === "objetivo") {
      if (ahorro.trim() && !parsePos(ahorro)) return "Escribe cuánto quieres ahorrar, por ejemplo 100."
      if (metaO.trim() && !parsePos(metaO)) return "Revisa el importe de la meta."
    }
    return ""
  }

  const next = () => {
    const e = validate()
    setErr(e)
    if (e) return
    if (step === "cuenta" && modo === "local" && !verified) onLocal()
    if (step === "cuenta" && accountOnly) return onLater()
    setStep(flow[Math.min(idx + 1, flow.length - 1)])
  }
  const back = () => {
    setErr("")
    setStep(flow[Math.max(idx - 1, 0)])
  }
  const skip = () => {
    setErr("")
    setStep(flow[Math.min(idx + 1, flow.length - 1)])
  }

  const sendCode = async () => {
    const v = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setErr("Escribe un correo válido.")
    if (!cloud) return
    setBusy(true)
    setErr("")
    const e = await cloud.sendCode(v)
    setBusy(false)
    if (e) return setErr(e)
    setEmail(v)
    setCodeSent(true)
    mailSentToast(v)
  }
  const verify = async () => {
    if (!/^\d{6,10}$/.test(code.trim())) return setErr("Escribe el código que te ha llegado por correo.")
    if (!cloud) return
    setBusy(true)
    setErr("")
    const e = await cloud.verifyCode(email, code)
    setBusy(false)
    if (e) return setErr(e)
    setVerified(true)
    if (accountOnly) setTimeout(onLater, 1200)
    else setTimeout(() => setStep("hola"), 1200)
  }

  if (!open) return null

  const name = nombre.trim()
  const orbi: { mood: OrbiMood; say: string } =
    step === "hola"
      ? { mood: "wave", say: "¡Hola! ¿Me cuentas un poco de ti?" }
      : step === "nombre"
        ? { mood: "happy", say: "Para saludarte como toca." }
        : step === "cobro"
          ? { mood: "think", say: "Así adapto la parte de trabajo." }
          : step === "sueldo"
            ? { mood: "think", say: "Un aproximado me vale." }
            : step === "jornada"
              ? { mood: "idle", say: "Para tu botón de fichar." }
              : step === "saldo"
                ? { mood: "wow", say: "Se queda solo en tu móvil." }
                : step === "objetivo"
                  ? { mood: "happy", say: "¡Vamos a por ello!" }
                  : step === "cuenta"
                    ? verified
                      ? { mood: "wow", say: "¡Cuenta creada! Tus datos, a salvo." }
                      : { mood: "wave", say: "¡Hola! Soy Orbi. ¿Entramos?" }
                  : { mood: "wave", say: name ? `¡Encantado, ${name}!` : "¡Todo listo!" }

  return (
    <div className="fixed inset-x-0 top-[var(--vvt,0px)] z-[80] flex h-[var(--vvh,100dvh)] items-end justify-center transition-[top,height] duration-200 sm:items-center" role="presentation">
      <div aria-hidden className="absolute inset-0 animate-in bg-[rgb(6_14_16/0.45)] backdrop-blur-[2px] duration-300 fade-in" onClick={onLater} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ob-title"
        data-lenis-prevent
        className="relative w-full animate-in duration-500 ease-out slide-in-from-bottom-10 fade-in sm:max-w-[440px]"
      >
        {/* Orbi asomando por encima de la hoja */}
        <div className="pointer-events-none absolute -top-[92px] left-5 flex items-end gap-2 [html.kb-open_&]:hidden">
          <Orbi mood={orbi.mood} className="w-[74px] drop-shadow-[0_10px_18px_rgb(18_178_193/0.45)]" />
          <span key={step} className="orbi-pop mb-14 rounded-2xl rounded-bl-sm bg-card px-3 py-1.5 text-[13px] font-medium shadow-lg ring-1 ring-glow/35">
            {orbi.say}
          </span>
        </div>

        <div className="pb-safe max-h-[calc(var(--vvh,100dvh)-110px)] overflow-y-auto overscroll-contain rounded-t-[28px] [html.kb-open_&]:max-h-[calc(var(--vvh,100dvh)-12px)] bg-card px-5 pt-5 shadow-[0_-20px_60px_-20px_rgb(6_14_16/0.5)] ring-1 ring-glow/25 sm:rounded-[28px] sm:pb-5">
          <div className="mb-4 flex items-center gap-3">
            {qIdx >= 0 ? (
              <div className="flex flex-1 gap-1" aria-label={`Pregunta ${qIdx + 1} de ${questions.length}`}>
                {questions.map((s, k) => (
                  <i key={s} className={cn("h-1.5 flex-1 rounded-full bg-muted transition-colors", k <= qIdx && "bg-primary")} />
                ))}
              </div>
            ) : (
              <span className="flex-1" />
            )}
            <button
              type="button"
              onClick={onLater}
              aria-label="Cerrar, lo hago más tarde"
              className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              if (step === "listo") return onFinish(answers(), true)
              next()
            }}
            className="grid gap-4"
          >
            {step === "hola" ? (
              <>
                <Title>Hagamos Orbe a tu medida</Title>
                <p className="text-[15px] text-muted-foreground">
                  Unas preguntas rápidas sobre tu trabajo, tu sueldo y tus metas. Así tu saldo será real, ficharás con tu horario y mis
                  consejos irán contigo. Puedes saltar cualquier pregunta.
                </p>
                <p className="text-xs text-muted-foreground">
                  ⏱ Menos de un minuto · {verified ? "☁️ Se guarda en tu cuenta" : "🔒 Se guarda en este dispositivo"}
                </p>
              </>
            ) : null}

            {step === "nombre" ? (
              <>
                <Title>¿Cómo te llamas?</Title>
                <Input
                  aria-label="Tu nombre"
                  placeholder="Tu nombre"
                  maxLength={30}
                  autoComplete="given-name"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-12 text-lg"
                />
              </>
            ) : null}

            {step === "cobro" ? (
              <>
                <Title>{name ? `${name}, ¿cómo` : "¿Cómo"} ganas tu dinero?</Title>
                <div role="radiogroup" aria-label="Cómo cobras" className="grid gap-2">
                  {COBROS.map((c, k) => (
                    <button
                      key={c.v}
                      type="button"
                      role="radio"
                      aria-checked={cobro === c.v}
                      data-autofocus={k === 0 ? "" : undefined}
                      onClick={() => setCobro(c.v)}
                      className={cn(
                        "grid rounded-2xl px-4 py-3 text-left ring-1 ring-foreground/10 transition-colors",
                        cobro === c.v ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/60"
                      )}
                    >
                      <span className="font-medium">{c.l}</span>
                      <span className="text-xs text-muted-foreground">{c.d}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {step === "sueldo" ? (
              <>
                <Title>{cobro === "horas" ? "¿Cuánto cobras?" : "¿Cuánto cobras al mes, más o menos?"}</Title>
                {cobro === "horas" ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="€ por hora (bruto)" id="ob-ph">
                      <Input id="ob-ph" inputMode="decimal" placeholder="7,50" value={ph} onChange={(e) => setPh(e.target.value)} />
                    </Field>
                    <Field label="€ por hora extra" id="ob-pe">
                      <Input id="ob-pe" inputMode="decimal" placeholder="9,50" value={pe} onChange={(e) => setPe(e.target.value)} />
                    </Field>
                  </div>
                ) : null}
                <div className="grid grid-cols-[1fr_110px] gap-2.5">
                  <Field label={cobro === "horas" ? "Neto al mes aprox. (€)" : "Neto al mes (€)"} id="ob-neto">
                    <Input id="ob-neto" inputMode="decimal" placeholder="880" value={neto} onChange={(e) => setNeto(e.target.value)} className="h-12 text-lg" />
                  </Field>
                  <Field label="Día de cobro" id="ob-dia">
                    <Input id="ob-dia" inputMode="numeric" placeholder="1" value={dia} onChange={(e) => setDia(e.target.value)} className="h-12 text-lg" />
                  </Field>
                </div>
                <Label className="flex items-start gap-2.5 font-normal">
                  <Checkbox checked={recordar} onCheckedChange={(v) => setRecordar(!!v)} className="mt-0.5" />
                  <span>
                    Recuérdame apuntar la nómina cada mes
                    <span className="block text-xs text-muted-foreground">Al llegar el día, podrás apuntarla con un toque y ajustar el importe.</span>
                  </span>
                </Label>
              </>
            ) : null}

            {step === "jornada" ? (
              <>
                <Title>¿Cómo es tu jornada normal?</Title>
                <div className="grid grid-cols-3 gap-2.5">
                  <Field label="Horas al día" id="ob-hd">
                    <Input id="ob-hd" inputMode="decimal" value={hd} onChange={(e) => setHd(e.target.value)} />
                  </Field>
                  <Field label="Entrada" id="ob-ini">
                    <Input id="ob-ini" type="time" value={ini} onChange={(e) => setIni(e.target.value)} />
                  </Field>
                  <Field label="Salida" id="ob-fin">
                    <Input id="ob-fin" type="time" value={fin} onChange={(e) => setFin(e.target.value)} />
                  </Field>
                </div>
                <p className="text-xs text-muted-foreground">Contaré como extra lo que pase de esas horas. ¿Tus turnos cambian de una semana a otra? Configúralos después en Trabajo › Mi horario.</p>
              </>
            ) : null}

            {step === "saldo" ? (
              <>
                <Title>¿Cuánto dinero tienes ahora?</Title>
                <p className="-mt-2 text-sm text-muted-foreground">Lo que hay hoy en tu cuenta. Así tu saldo en Orbe será el real desde el primer día.</p>
                <div className="flex items-center gap-2">
                  <Input aria-label="Dinero en tu cuenta hoy, en euros" inputMode="decimal" placeholder="0" value={saldo} onChange={(e) => setSaldo(e.target.value)} className="h-12 text-lg" />
                  <span className="text-lg text-muted-foreground">€</span>
                </div>
              </>
            ) : null}

            {step === "objetivo" ? (
              <>
                <Title>¿Qué quieres conseguir?</Title>
                <div role="radiogroup" aria-label="Tu objetivo" className="flex flex-wrap gap-2">
                  {OBJETIVOS.map((o, k) => (
                    <button
                      key={o.v}
                      type="button"
                      role="radio"
                      aria-checked={objetivo === o.v}
                      data-autofocus={k === 0 ? "" : undefined}
                      onClick={() => setObjetivo(o.v)}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-sm font-medium ring-1 ring-foreground/10 transition-colors",
                        objetivo === o.v ? "bg-primary text-primary-foreground ring-primary" : "hover:bg-muted/60"
                      )}
                    >
                      <span aria-hidden className="mr-1.5">
                        {o.e}
                      </span>
                      {o.l}
                    </button>
                  ))}
                </div>
                {objetivo === "ahorrar" ? (
                  <div className="grid grid-cols-[1fr_120px] gap-2.5">
                    <Field label="¿Para qué?" id="ob-mn">
                      <Input id="ob-mn" placeholder="Viaje, coche, portátil…" maxLength={40} value={metaN} onChange={(e) => setMetaN(e.target.value)} />
                    </Field>
                    <Field label="¿Cuánto? (€)" id="ob-mo">
                      <Input id="ob-mo" inputMode="decimal" placeholder="1.000" value={metaO} onChange={(e) => setMetaO(e.target.value)} />
                    </Field>
                  </div>
                ) : null}
                <Field label="¿Cuánto te gustaría ahorrar cada mes? (€)" id="ob-ah">
                  <Input
                    id="ob-ah"
                    inputMode="decimal"
                    placeholder={ahorroSugerido ? fmtPlain(ahorroSugerido) : "100"}
                    value={ahorro}
                    onChange={(e) => setAhorro(e.target.value)}
                  />
                </Field>
                {ahorroSugerido ? (
                  <p className="-mt-2 text-xs text-muted-foreground">
                    Consejo: el 20 % de tu sueldo serían unos {eur(ahorroSugerido)}.{" "}
                    <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => setAhorro(fmtPlain(ahorroSugerido))}>
                      Usar esa cantidad
                    </button>
                  </p>
                ) : null}
              </>
            ) : null}

            {step === "cuenta" ? (
              <>
                <p className="-mb-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">Bienvenido a Orbe</p>
                <Title>¿Entras con tu cuenta?</Title>
                <div role="radiogroup" aria-label="Dónde guardar tus datos" className="grid gap-2">
                  {(
                    [
                      ["nube", CloudIcon, "Iniciar sesión o crear cuenta", "Con tu correo, sin contraseñas. Tus datos a salvo en la nube y en todos tus dispositivos."],
                      ["local", SmartphoneIcon, "Continuar sin cuenta", "Todo se guarda solo en este móvil."],
                    ] as const
                  ).map(([v, Icon, l, d], k) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={modo === v}
                      data-autofocus={k === 0 ? "" : undefined}
                      disabled={verified}
                      onClick={() => {
                        setModo(v)
                        setErr("")
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl px-4 py-3 text-left ring-1 ring-foreground/10 transition-colors",
                        modo === v ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/60"
                      )}
                    >
                      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                      <span className="grid">
                        <span className="font-medium">{l}</span>
                        <span className="text-xs text-muted-foreground">{d}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {modo === "local" ? (
                  <div role="note" className="flex gap-2.5 rounded-2xl bg-warn/15 px-3.5 py-3 text-sm ring-1 ring-warn/40">
                    <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-[#8a5a00] dark:text-warn" />
                    <span>
                      Tus datos se quedarán <b>solo en este dispositivo</b>. Si borras los datos del navegador o cambias de móvil, se
                      perderán. Cuando quieras, en el menú <b>☰ › Cuenta y nube</b> pones tu correo y se sube todo lo que hayas apuntado.
                    </span>
                  </div>
                ) : null}

                {modo === "nube" ? (
                  verified ? (
                    <p className="flex items-center gap-2 rounded-2xl bg-good/12 px-3.5 py-3 text-sm font-medium text-good">
                      ✓ Sesión iniciada: {email}. Tus datos se guardan en la nube.
                    </p>
                  ) : !codeSent ? (
                    <div className="grid gap-2">
                      <Field label="Tu correo electrónico" id="ob-email">
                        <Input
                          id="ob-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="tu@correo.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              void sendCode()
                            }
                          }}
                          className="h-12"
                        />
                      </Field>
                      <Button type="button" variant="outline" className="h-11 rounded-full" disabled={busy} onClick={() => void sendCode()}>
                        {busy ? <Spinner /> : null} Enviarme un código
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <p className="text-sm">
                        Te he enviado un código a <b>{email}</b>. Puede tardar un minuto; mira también en spam.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          aria-label="Código del correo"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="Código"
                          maxLength={10}
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              void verify()
                            }
                          }}
                          className="h-12 font-heading text-lg tracking-[0.25em]"
                        />
                        <Button type="button" className="h-12 shrink-0 rounded-full px-5" disabled={busy} onClick={() => void verify()}>
                          {busy ? <Spinner /> : null} Verificar
                        </Button>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => void sendCode()}>
                          Reenviar el código
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground underline-offset-2 hover:underline"
                          onClick={() => {
                            setCodeSent(false)
                            setCode("")
                            setErr("")
                          }}
                        >
                          Cambiar de correo
                        </button>
                      </div>
                    </div>
                  )
                ) : null}
              </>
            ) : null}

            {step === "listo" ? (
              <>
                <Title>{name ? `¡Listo, ${name}!` : "¡Listo!"}</Title>
                <ul className="grid gap-1.5 text-sm text-muted-foreground">
                  <Summary on={!!cobro && cobro !== "no"}>Tu trabajo y tu sueldo quedan configurados</Summary>
                  <Summary on={recordar && !!netoC}>Te recordaré apuntar la nómina cada mes</Summary>
                  <Summary on={!!saldo.trim()}>Tu saldo empieza con tu dinero real</Summary>
                  <Summary on={!!objetivo}>Tus consejos irán enfocados a tu objetivo</Summary>
                  <Summary on={!!ahorro.trim()}>Verás tu progreso de ahorro del mes en Inicio</Summary>
                  <Summary on={verified}>Tus datos se guardan también en la nube, en todos tus dispositivos</Summary>
                  <Summary on={askAccount && !verified}>Tus datos se guardan en este dispositivo (puedes subirlos a la nube desde «Más»)</Summary>
                </ul>
                <p className="text-xs text-muted-foreground">Puedes cambiar todo esto cuando quieras desde «Más».</p>
              </>
            ) : null}

            <p role="alert" className="min-h-0 text-sm font-medium text-destructive empty:hidden">
              {err}
            </p>

            <div className="flex items-center justify-between gap-2 pb-1">
              {step === "hola" || (step === "cuenta" && idx === 0) ? (
                <Button type="button" variant="ghost" onClick={onLater}>
                  Ahora no
                </Button>
              ) : step === "listo" ? (
                <Button type="button" variant="ghost" onClick={() => onFinish(answers(), false)}>
                  Empezar sin tutorial
                </Button>
              ) : (
                <span className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={back}>
                    Atrás
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={skip}>
                    Saltar
                  </Button>
                </span>
              )}
              <Button type="submit" data-primary="" className="h-11 rounded-full px-6 text-[15px]">
                {step === "hola"
                  ? "Empezar"
                  : step === "listo"
                    ? "Enséñame la app"
                    : step === "cuenta"
                      ? modo === "local"
                        ? "Continuar sin cuenta"
                        : accountOnly && verified
                          ? "Listo"
                          : "Continuar"
                      : "Siguiente"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 id="ob-title" className="font-heading text-[22px] leading-tight font-semibold tracking-tight">
      {children}
    </h2>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function Summary({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (!on) return null
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-good text-[10px] text-white">
        ✓
      </span>
      {children}
    </li>
  )
}
