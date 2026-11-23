/** Datos legales de Orbe en un solo sitio: titular, contacto y fecha de los textos. */
export const TITULAR = "Jacob Meléndez"
export const CONTACTO = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "soporte.moneycare.orbe@gmail.com"
export const WEB = "https://moneycare-five.vercel.app"
export const ANIO = 2026
export const ACTUALIZADO = "noviembre de 2026"
export const COPYRIGHT = `© ${ANIO} ${TITULAR}. Todos los derechos reservados.`

/** Imagen al compartir el enlace (WhatsApp, redes…), 1200 × 630. */
export const OG_IMAGE = {
  url: "/og-orbe.jpg",
  width: 1200,
  height: 630,
  alt: "Orbe, app de control financiero: la app en dos móviles y el asistente Orbi. Tu dinero y tus turnos, en un solo sitio.",
}
