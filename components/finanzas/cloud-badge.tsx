import { CloudIcon } from "lucide-react"

import type { CloudStatus } from "@/hooks/use-cloud"
import { cn } from "@/lib/utils"

/** Estado de la nube en un icono: verde ✓ guardado · rojo ! sin guardar · girando al sincronizar. */
export function CloudBadge({ status, className }: { status: CloudStatus | null; className?: string }) {
  const ok = status === "synced"
  const busy = status === "syncing" || status === "pending"
  const label = ok
    ? "Tus datos están guardados en la nube"
    : busy
      ? "Guardando en la nube…"
      : status === "offline"
        ? "Sin conexión: se guardará en la nube al volver"
        : status && status !== "off"
          ? "No se ha podido guardar en la nube"
          : "Sin cuenta: tus datos solo están en este dispositivo"
  return (
    <span role="img" aria-label={label} title={label} className={cn("relative inline-grid size-8 shrink-0 place-items-center", className)}>
      <CloudIcon className={cn("size-7", ok ? "text-good" : busy ? "text-primary" : "text-bad")} strokeWidth={2} />
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 grid place-items-center pt-1 text-[11px] leading-none font-black",
          ok ? "text-good" : busy ? "text-primary" : "text-bad"
        )}
      >
        {ok ? "✓" : busy ? <span className="block size-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : "!"}
      </span>
    </span>
  )
}
