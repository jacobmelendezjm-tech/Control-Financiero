import type { Metadata } from "next"

import { LegalPage, Section } from "@/components/legal-page"
import { CONTACTO, TITULAR } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Privacidad · Orbe",
  description: "Qué datos guarda Orbe, dónde, con quién y cómo borrarlos.",
}

export default function Privacidad() {
  return (
    <LegalPage title="Privacidad y cookies">
      <Section title="En resumen">
        <ul className="list-disc space-y-1 pl-5">
          <li>Puedes usar Orbe sin cuenta: entonces tus datos financieros se quedan solo en tu dispositivo.</li>
          <li>Si creas una cuenta, se guarda una copia de tus datos en la nube para que no los pierdas y los tengas en varios dispositivos.</li>
          <li>Solo tú puedes ver tus datos. No se venden, no se usan para publicidad y no hay seguimiento ni analítica.</li>
          <li>Puedes descargar tus datos y borrar tu cuenta en cualquier momento desde la app.</li>
        </ul>
      </Section>

      <Section title="Responsable">
        <p>
          El responsable del tratamiento es {TITULAR}, titular de Orbe. Contacto para cualquier tema de privacidad:{" "}
          <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
        </p>
      </Section>

      <Section title="Qué datos se tratan">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Lo que tú apuntas:</b> movimientos (ingresos y gastos), categorías, presupuestos, gastos fijos, metas de ahorro,
            jornadas, turnos y horarios, nóminas y las respuestas del formulario de bienvenida (nombre, forma de cobro, sueldo
            aproximado, objetivo e intereses).
          </li>
          <li>
            <b>Si creas una cuenta:</b> tu correo electrónico, que solo se usa para iniciar sesión con un código.
          </li>
          <li>
            <b>Si activas los recordatorios:</b> la dirección técnica de notificaciones de tu navegador, tu zona horaria y el texto
            de los avisos programados (pueden incluir tu nombre y la hora de fin de tu turno). Esto se guarda en el servidor aunque
            no tengas cuenta, porque es la única forma de enviarte avisos con la app cerrada. Se borra al desactivarlos.
          </li>
          <li>
            <b>Datos técnicos:</b> al abrir la web, el proveedor de alojamiento recibe tu dirección IP y datos del navegador, como
            cualquier web, para servirla y protegerla.
          </li>
        </ul>
        <p>Orbe no te pide datos bancarios ni se conecta a tu banco. No trata datos de salud ni otros datos especiales.</p>
      </Section>

      <Section title="Para qué y con qué base legal">
        <p>
          Únicamente para que la app funcione: mostrarte tus cuentas, calcular tus estadísticas, sincronizar tus datos entre tus
          dispositivos y enviarte los recordatorios que pidas. La base legal es la prestación del servicio que solicitas al usar
          la app o crear la cuenta (art. 6.1.b del RGPD) y tu consentimiento para las notificaciones (art. 6.1.a), que puedes
          retirar cuando quieras.
        </p>
      </Section>

      <Section title="Dónde se guardan y con quién">
        <p>
          <b>Sin cuenta:</b> en el almacenamiento de tu navegador, en tu dispositivo.
        </p>
        <p>
          <b>Con cuenta:</b> además, en una base de datos protegida para que cada persona solo pueda acceder a sus propios datos.
          La conexión va cifrada.
        </p>
        <p>Para dar el servicio se usan estos proveedores, que tratan los datos solo por encargo de Orbe:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Supabase</b> (base de datos, inicio de sesión y recordatorios).
          </li>
          <li>
            <b>Vercel</b> (alojamiento de la web).
          </li>
          <li>
            <b>Brevo</b> (envío del correo con el código de acceso).
          </li>
          <li>
            El servicio de notificaciones de tu navegador (Google, Apple, Mozilla o Microsoft), si activas los recordatorios.
          </li>
        </ul>
        <p>
          Algunos de estos proveedores son de Estados Unidos. En ese caso, la transferencia se ampara en las garantías del RGPD,
          como el Marco de Privacidad de Datos UE-EE. UU. o las cláusulas contractuales tipo de la Comisión Europea. No se cede
          ningún dato a nadie más, salvo obligación legal.
        </p>
      </Section>

      <Section title="Cuánto tiempo">
        <p>
          Mientras tengas la cuenta. Al borrarla, tus datos de la nube se eliminan de forma inmediata y definitiva. Los datos de
          los recordatorios, hasta que los desactives.
        </p>
      </Section>

      <Section title="Edad mínima">
        <p>Orbe no está dirigida a menores de 14 años, que no deben crear una cuenta.</p>
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
            <b>Oposición, limitación y retirada del consentimiento:</b> escribe a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
          </li>
          <li>
            Si crees que no se respetan tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (
            <a href="https://www.aepd.es">aepd.es</a>).
          </li>
        </ul>
      </Section>

      <Section title="Cookies y almacenamiento">
        <p>
          Orbe no usa cookies de publicidad, de análisis ni de terceros. Solo guarda en tu navegador lo imprescindible para
          funcionar: tus datos, tus preferencias (tema, tutorial, recordatorios) y, si inicias sesión, la sesión. Al ser
          estrictamente necesario para el servicio que pides, no requiere aviso de consentimiento (art. 22.2 de la LSSI-CE).
        </p>
      </Section>

      <Section title="Cambios">
        <p>Si esta política cambia de forma importante, se avisará en la app.</p>
      </Section>
    </LegalPage>
  )
}
