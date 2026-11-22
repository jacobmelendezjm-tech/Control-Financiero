import type { Metadata, Viewport } from "next"
import { Geist_Mono, Instrument_Serif, Inter, Sora } from "next/font/google"

import "./globals.css"
import { KeyboardAware } from "@/components/keyboard-aware"
import { SmoothScroll } from "@/components/smooth-scroll"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const sora = Sora({ subsets: ["latin"], variable: "--font-display" })
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["italic", "normal"], variable: "--font-serif" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "Orbe · Control financiero",
  description: "Ingresos, gastos, gastos hormiga, ahorro, nóminas y horas de trabajo en tu móvil.",
  applicationName: "Orbe",
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
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
