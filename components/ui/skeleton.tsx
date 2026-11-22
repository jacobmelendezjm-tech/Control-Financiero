import * as React from "react"
import { LoaderCircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Bloque gris con brillo que ocupa el sitio del contenido mientras carga. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("skeleton rounded-xl", className)} {...props} />
}

/** Spinner circular; hereda el color y el tamaño del texto que lo rodea. */
function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <LoaderCircleIcon aria-hidden className={cn("size-4 animate-spin", className)} />
      <span className="sr-only">{label || "Cargando…"}</span>
    </span>
  )
}

export { Skeleton, Spinner }
