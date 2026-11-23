import type { Metadata, Viewport } from "next"
import { Geist_Mono, Instrument_Serif, Inter, Sora } from "next/font/google"

import "./globals.css"
import { KeyboardAware } from "@/components/keyboard-aware"
import { SmoothScroll } from "@/components/smooth-scroll"
import { ThemeProvider } from "@/components/theme-provider"
import { COPYRIGHT, OG_IMAGE, TITULAR, WEB } from "@/lib/legal"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const sora = Sora({ subsets: ["latin"], variable: "--font-display" })
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["italic", "normal"], variable: "--font-serif" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

const DESCRIPCION = "Gastos, ahorro, nóminas y horas extra en tu móvil, con Orbi como asistente. Gratis y sin anuncios."

export const metadata: Metadata = {
  metadataBase: new URL(WEB),
  title: "Orbe · Control financiero",
  description: DESCRIPCION,
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Orbe",
    url: "/",
    title: "Orbe · Tu dinero y tus turnos, en un solo sitio",
    description: DESCRIPCION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orbe · Tu dinero y tus turnos, en un solo sitio",
    description: DESCRIPCION,
    images: [OG_IMAGE],
  },
  applicationName: "Orbe",
  authors: [{ name: TITULAR }],
  creator: TITULAR,
  publisher: TITULAR,
  other: { copyright: COPYRIGHT },
  appleWebApp: { capable: true, title: "Orbe", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android: con el teclado abierto la página encoge en vez de quedar tapada.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9f6f6" },
    { media: "(prefers-color-scheme: dark)", color: "#172123" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, inter.variable, sora.variable, serif.variable, "font-sans")}
    >
      <body>
        <ThemeProvider>
          <KeyboardAware />
          <SmoothScroll>{children}</SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  )
}
