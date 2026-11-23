import { cn } from "@/lib/utils"
import { COPYRIGHT } from "@/lib/legal"

/** Enlaces a los textos legales y aviso de derechos de autor. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-1 text-xs text-muted-foreground", className)}>
      <nav aria-label="Información legal" className="flex flex-wrap gap-x-3 gap-y-1">
        <a href="/aviso-legal" className="underline underline-offset-2 hover:text-foreground">
          Aviso legal
        </a>
        <a href="/terminos" className="underline underline-offset-2 hover:text-foreground">
          Términos de uso
        </a>
        <a href="/privacidad" className="underline underline-offset-2 hover:text-foreground">
          Privacidad y cookies
        </a>
      </nav>
      <p>{COPYRIGHT}</p>
    </div>
  )
}
