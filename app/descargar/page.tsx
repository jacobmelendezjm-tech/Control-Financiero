import type { Metadata } from "next"

import { InstallCard } from "@/components/install-card"
import { LegalLinks } from "@/components/legal-links"
import { OrbeMark } from "@/components/finanzas/logo"
import { Orbi } from "@/components/finanzas/orbi"
import { OG_IMAGE } from "@/lib/legal"

const TITULO = "Descarga Orbe · Tu dinero y tus turnos, en un solo sitio"
const DESCRIPCION = "Instala Orbe gratis en tu móvil: gastos, ahorro, nóminas y horas extra, con Orbi como asistente. Sin anuncios."

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: "/descargar" },
  openGraph: { title: TITULO, description: DESCRIPCION, url: "/descargar", type: "website", locale: "es_ES", siteName: "Orbe", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRIPCION, images: [OG_IMAGE] },
}

const FUNCIONES = [
  ["💸", "Ingresos y gastos", "Apunta en un toque y mira tu saldo real al momento."],
  ["🐜", "Gastos hormiga", "Descubre cuánto se te va en pequeños gastos al mes y al año."],
  ["⏱️", "Turnos y horas extra", "Turnos rotativos, fichar la jornada y extras calculadas solas."],
  ["🧾", "Nóminas", "Bruto, IRPF, Seguridad Social y neto, mes a mes."],
  ["🎯", "Ahorro y metas", "Huchas con objetivo para lo que de verdad te importa."],
  ["🔒", "Tus datos, tuyos", "Funciona sin cuenta. Con cuenta, copia en la nube solo para ti."],
] as const

export default function Descargar() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#0f1a1c] text-white">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(700px_500px_at_85%_10%,rgb(18_178_193/0.45),transparent_60%),radial-gradient(600px_480px_at_10%_100%,rgb(35_113_123/0.6),transparent_60%)]"
      />
      <div className="mx-auto max-w-5xl px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-12 lg:px-8">
        <header className="flex items-center gap-3">
          <OrbeMark className="size-11" />
          <span className="grid leading-none">
            <span className="font-heading text-2xl font-semibold tracking-tight">Orbe</span>
            <span className="mt-1 text-[10px] font-semibold tracking-[0.28em] text-[#8ff6ff]/85">CONTROL FINANCIERO</span>
          </span>
        </header>

        <section className="mt-10 grid items-center gap-10 lg:mt-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="font-heading text-[40px] leading-[1.05] font-semibold tracking-tight sm:text-6xl">
              Tu dinero y tus turnos,{" "}
              <span className="bg-gradient-to-r from-[#8ff6ff] to-[#12b2c1] bg-clip-text text-transparent">en un solo sitio</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Gastos, ahorro, nóminas y horas extra en tu móvil, con Orbi como asistente. Gratis, sin anuncios y sin registrarte si no
              quieres.
            </p>
            <InstallCard />
          </div>
          <div className="relative mx-auto hidden w-full max-w-sm sm:block" aria-hidden>
            <div className="absolute inset-0 -z-10 rounded-full bg-[#12b2c1]/25 blur-3xl" />
            <Orbi mood="wave" className="orbi-float mx-auto w-56 drop-shadow-[0_20px_40px_rgb(0_0_0/0.45)]" />
          </div>
        </section>

        <section aria-label="Qué puedes hacer con Orbe" className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONES.map(([icono, titulo, texto]) => (
            <div key={titulo} className="rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10">
              <p className="text-2xl" aria-hidden>
                {icono}
              </p>
              <h2 className="mt-2 font-heading text-lg font-semibold">{titulo}</h2>
              <p className="mt-1 text-sm text-white/70">{texto}</p>
            </div>
          ))}
        </section>

        <footer className="mt-14 border-t border-white/10 pt-6 [&_*]:text-white/60 [&_a:hover]:text-white">
          <LegalLinks />
        </footer>
      </div>
    </main>
  )
}
