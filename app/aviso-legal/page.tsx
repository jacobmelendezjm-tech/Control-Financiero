import type { Metadata } from "next"

import { LegalPage, Section } from "@/components/legal-page"
import { ANIO, CONTACTO, TITULAR, WEB } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Aviso legal · Orbe",
  description: "Quién está detrás de Orbe, derechos de autor y condiciones de la web.",
}

export default function AvisoLegal() {
  return (
    <LegalPage title="Aviso legal">
      <Section title="Quién está detrás de Orbe">
        <p>
          Orbe (también llamada MoneyCare), su asistente Orbi y la web <a href={WEB}>{WEB.replace("https://", "")}</a> son obra de{" "}
          <b>{TITULAR}</b>, que es su titular y responsable. Puedes escribir a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a> para
          cualquier consulta.
        </p>
        <p>
          Orbe es gratuita, no tiene publicidad ni compras dentro de la app y no se ofrece como actividad económica. Este aviso
          cumple con el deber de información de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio
          Electrónico (LSSI-CE).
        </p>
      </Section>

      <Section title="Derechos de autor y propiedad intelectual">
        <p>
          © {ANIO} {TITULAR}. <b>Todos los derechos reservados.</b> El código fuente, el diseño, los textos, los gráficos, los
          iconos, el logotipo, el nombre «Orbe», el personaje Orbi (su dibujo, sus animaciones y su personalidad), los vídeos, la
          música original y el resto de contenidos son propiedad de {TITULAR} y están protegidos por el Real Decreto Legislativo
          1/1996, de Propiedad Intelectual, y por los tratados internacionales sobre derechos de autor.
        </p>
        <p>
          Sin permiso previo y por escrito del titular queda prohibido copiar, reproducir, distribuir, comunicar públicamente,
          transformar, descompilar o hacer ingeniería inversa de la app o de cualquiera de sus partes, así como publicar copias,
          versiones modificadas o apps derivadas, salvo en lo que la ley permita expresamente. Usar Orbe no te da ningún derecho
          sobre ella más allá de usarla de forma personal (consulta los <a href="/terminos">Términos de uso</a>).
        </p>
        <p>
          Orbe usa programas y tipografías de código abierto de terceros (por ejemplo Next.js, React, Lucide y las tipografías
          Inter y Sora), cada uno con su propia licencia, cuyos derechos conservan sus autores.
        </p>
      </Section>

      <Section title="Responsabilidad">
        <p>
          Orbe es una herramienta para organizar tus finanzas personales. Sus cálculos (nóminas, IRPF, Seguridad Social, horas
          extra, proyecciones o consejos) son <b>estimaciones orientativas</b> a partir de los datos que tú introduces y no son
          asesoramiento financiero, fiscal, laboral ni jurídico. Para decisiones importantes, consulta tu nómina oficial, tu
          convenio o a un profesional.
        </p>
        <p>
          El titular procura que la app funcione bien y sin interrupciones, pero no puede garantizarlo y, en la medida en que la
          ley lo permita, no responde de los daños causados por fallos técnicos, pérdidas de datos, interrupciones del servicio o
          un uso de la app distinto del previsto.
        </p>
      </Section>

      <Section title="Enlaces">
        <p>Si Orbe enlaza a webs de terceros, el titular no controla ni responde de su contenido.</p>
      </Section>

      <Section title="Ley aplicable">
        <p>
          Este aviso se rige por la legislación española. Si eres consumidor, cualquier conflicto se resolverá ante los juzgados
          de tu domicilio.
        </p>
      </Section>
    </LegalPage>
  )
}
