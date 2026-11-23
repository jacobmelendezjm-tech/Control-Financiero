/*
 * Inicio de sesión a medias: correo al que se envió el código.
 * En el móvil, al salir de la app para copiar el código del correo, el sistema
 * puede cerrarla y al volver se recarga desde cero. Guardándolo aquí, la app
 * vuelve directamente a «escribe el código» en vez de empezar de nuevo.
 */
const KEY = "orbe.login"
/** Los códigos de Supabase caducan en una hora. */
const TTL = 60 * 60 * 1000

export function savePendingLogin(email: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ email, at: Date.now() }))
  } catch {}
}

export function readPendingLogin(): string | null {
  if (typeof window === "undefined") return null
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null") as { email?: string; at?: number } | null
    if (v?.email && v.at && Date.now() - v.at < TTL) return v.email
    if (v) localStorage.removeItem(KEY)
  } catch {}
  return null
}

export function clearPendingLogin() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}

/** Lee el portapapeles y devuelve solo los dígitos del código (o "" si no se puede). */
export async function pasteCode(): Promise<string> {
  try {
    const t = await navigator.clipboard.readText()
    const m = /\d{6,10}/.exec(t.replace(/\s/g, ""))
    return m ? m[0] : ""
  } catch {
    return ""
  }
}
