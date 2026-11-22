import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacidad · Orbe",
  description: "Qué datos guarda Orbe, dónde y cómo borrarlos.",
}

const CONTACTO = process.env.NEXT_PUBLIC_CONTACT_EMAIL

export default function Privacidad() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-[15px] leading-relaxed">
      <Link href="/" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
        ← Volver a Orbe
      </Link>
      <h1 className="mt-4 mb-2 font-heading text-3xl font-semibold tracking-tight">Privacidad</h1>
      <p className="mb-8 text-muted-foreground">Última actualización: noviembre de 2026</p>

      <Section title="En resumen">
        <ul className="list-disc space-y-1 pl-5">
          <li>Puedes usar Orbe sin cuenta: entonces tus datos se quedan solo en tu dispositivo.</li>
          <li>Si creas una cuenta, guardamos una copia de tus datos en la nube para que no los pierdas y los tengas en varios dispositivos.</li>
          <li>Solo tú puedes ver tus datos. No los vendemos, no los compartimos y no hay publicidad ni seguimiento.</li>
          <li>Puedes descargar tus datos y borrar tu cuenta en cualquier momento desde la app.</li>
        </ul>
      </Section>

      <Section title="Qué datos se guardan">
        <p>
          Los que tú apuntas: movimientos (ingresos y gastos), categorías, presupuestos, gastos fijos, metas de ahorro, jornadas y
          horarios de trabajo, nóminas y los datos del formulario de bienvenida (nombre, forma de cobro, sueldo aproximado, objetivo).
          Si creas una cuenta, también tu correo electrónico, que solo se usa para iniciar sesión.
        </p>
      </Section>

      <Section title="Dónde se guardan">
        <p>
          <b>Sin cuenta:</b> en el almacenamiento de tu navegador, en tu dispositivo. No salen de él.
        </p>
        <p className="mt-2">
          <b>Con cuenta:</b> además, en una base de datos de Supabase (nuestro proveedor de servidores), protegida para que cada persona
          solo pueda acceder a sus propios datos. La conexión va cifrada.
        </p>
      </Section>

      <Section title="Para qué se usan">
        <p>
          Únicamente para que la app funcione: mostrarte tus cuentas, calcular tus estadísticas y sincronizar tus datos entre tus
          dispositivos. La base legal es tu consentimiento al crear la cuenta y la prestación del servicio que pides.
        </p>
      </Section>

      <Section title="Cuánto tiempo">
        <p>Mientras tengas la cuenta. Al borrarla, tus datos de la nube se eliminan de forma inmediata y definitiva.</p>
      </Section>

      <Section title="Tus derechos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Acceso y portabilidad:</b> en Más › Ajustes y copias › «Descargar copia completa».
          </li>
          <li>
            <b>Rectificación:</b> edita cualquier dato desde la propia app.
          </li>
          <li>
            <b>Supresión:</b> en Más › Tu cuenta › «Borrar mi cuenta».
          </li>
          <li>
            También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
            {CONTACTO ? (
              <>
                {" "}
                Para cualquier duda, escríbenos a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
              </>
            ) : null}
          </li>
        </ul>
      </Section>

      <Section title="Cookies y almacenamiento">
        <p>
          Orbe no usa cookies de publicidad ni de análisis. Solo guarda en tu navegador lo necesario para funcionar: tus datos, tus
          preferencias (tema, tutorial) y, si inicias sesión, la sesión.
        </p>
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="mb-2 font-heading text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}
