import type { Metadata } from "next"

import { LegalPage, Section } from "@/components/legal-page"
import { CONTACTO, TITULAR } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Términos de uso · Orbe",
  description: "Las condiciones para usar Orbe.",
}

export default function Terminos() {
  return (
    <LegalPage title="Términos de uso">
      <Section title="Qué es esto">
        <p>
          Estas condiciones regulan el uso de Orbe, la app de control financiero personal de {TITULAR}. Al usar la app, con o sin
          cuenta, las aceptas. Si no estás de acuerdo, no la uses.
        </p>
      </Section>

      <Section title="Quién puede usarla">
        <p>Necesitas tener al menos 14 años. Si eres menor de edad, úsala con el conocimiento de tus padres o tutores.</p>
      </Section>

      <Section title="El servicio">
        <ul className="list-disc space-y-1 pl-5">
          <li>Orbe es gratuita. Si algún día hubiera funciones de pago, se avisará antes y nunca se cobrará nada sin tu permiso.</li>
          <li>
            Puedes usarla sin cuenta (tus datos se quedan en tu dispositivo) o crear una cuenta con tu correo para tener una copia
            en la nube.
          </li>
          <li>
            La app puede cambiar, mejorar o dejar de ofrecerse. Si se fuera a cerrar, se avisará con antelación para que puedas
            descargar tus datos.
          </li>
          <li>
            Sin cuenta, si borras los datos del navegador o pierdes el móvil, pierdes tus datos. Descarga una copia de vez en
            cuando desde Ajustes.
          </li>
        </ul>
      </Section>

      <Section title="No es asesoramiento profesional">
        <p>
          Los importes de nóminas, IRPF, Seguridad Social, horas extra, presupuestos, proyecciones y consejos son{" "}
          <b>estimaciones orientativas</b> calculadas con lo que tú apuntas. No sustituyen a tu nómina oficial, a tu convenio
          colectivo, a la Agencia Tributaria ni a un asesor. Antes de reclamar horas, pedir un préstamo o tomar otra decisión
          importante, compruébalo con la fuente oficial o con un profesional.
        </p>
      </Section>

      <Section title="Tu cuenta y tus datos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Tus datos son tuyos. Puedes descargarlos y borrar tu cuenta cuando quieras desde la app.</li>
          <li>Eres responsable de lo que apuntas y de mantener seguro tu correo, porque con él se entra en la cuenta.</li>
          <li>
            Cómo se tratan tus datos personales se explica en la <a href="/privacidad">Política de privacidad</a>.
          </li>
        </ul>
      </Section>

      <Section title="Uso correcto">
        <p>No está permitido:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Usar Orbe para fines ilegales o para guardar datos de otras personas sin su permiso.</li>
          <li>Intentar acceder a datos de otros usuarios, saltarse la seguridad o sobrecargar los servidores.</li>
          <li>
            Copiar, descompilar, hacer ingeniería inversa, revender, redistribuir o publicar la app, su código, su diseño o a Orbi,
            o crear apps derivadas, salvo en lo que la ley permita expresamente.
          </li>
          <li>Usar el nombre «Orbe», su logotipo o el personaje Orbi sin permiso por escrito.</li>
        </ul>
        <p>Si se incumplen estas normas, se podrá suspender o cerrar la cuenta.</p>
      </Section>

      <Section title="Propiedad intelectual">
        <p>
          Orbe y todos sus contenidos son de {TITULAR} (más detalle en el <a href="/aviso-legal">Aviso legal</a>). Al usarla
          recibes una licencia gratuita, personal, no exclusiva e intransferible para usarla en tus dispositivos con fines
          privados. No se te transfiere ningún otro derecho.
        </p>
      </Section>

      <Section title="Responsabilidad">
        <p>
          La app se ofrece tal cual. Se trabaja para que funcione bien, pero no se garantiza que esté siempre disponible o libre
          de errores. En la medida en que la ley lo permita, el titular no responde de pérdidas económicas o de datos derivadas
          del uso de la app ni de decisiones tomadas a partir de sus cálculos. Nada de esto limita los derechos que la ley te
          reconoce como consumidor.
        </p>
      </Section>

      <Section title="Cambios y contacto">
        <p>
          Si estas condiciones cambian de forma importante, se avisará en la app. Para cualquier duda, escribe a{" "}
          <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
        </p>
        <p>Se rigen por la ley española. Si eres consumidor, son competentes los juzgados de tu domicilio.</p>
      </Section>
    </LegalPage>
  )
}
