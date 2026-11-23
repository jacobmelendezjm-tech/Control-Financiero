import Link from "next/link"

import { LegalLinks } from "@/components/legal-links"
import { ACTUALIZADO } from "@/lib/legal"

/** Maqueta común de las páginas legales (aviso legal, términos y privacidad). */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-[15px] leading-relaxed">
      <Link href="/" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
        ← Volver a Orbe
      </Link>
      <h1 className="mt-4 mb-2 font-heading text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mb-8 text-muted-foreground">Última actualización: {ACTUALIZADO}</p>
      {children}
      <footer className="mt-10 border-t pt-5">
        <LegalLinks />
      </footer>
    </main>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_p+p]:mt-2">
      <h2 className="mb-2 font-heading text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}
