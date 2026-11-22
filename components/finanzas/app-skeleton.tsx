import { Skeleton } from "@/components/ui/skeleton"

/** Esqueleto con la forma de la pantalla de Inicio (mientras se leen o se bajan los datos). */
export function HomeSkeleton({ label = "Cargando tus cuentas…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <span className="sr-only">{label}</span>
      <div className="grid gap-4">
        <div className="grid gap-2 px-1">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-7 w-44 rounded-lg" />
        </div>
        {/* tarjeta de saldo */}
        <div className="grid gap-3 rounded-[28px] bg-hero/90 p-5">
          <Skeleton className="h-3 w-24 rounded-full bg-white/10" />
          <Skeleton className="h-12 w-56 rounded-xl bg-white/10" />
          <Skeleton className="h-3 w-48 rounded-full bg-white/10" />
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <Skeleton className="h-12 rounded-2xl bg-white/15" />
            <Skeleton className="h-12 rounded-2xl bg-white/10" />
          </div>
        </div>
        {/* accesos rápidos */}
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid justify-items-center gap-1.5">
              <Skeleton className="size-14 rounded-2xl" />
              <Skeleton className="h-2.5 w-12 rounded-full" />
            </div>
          ))}
        </div>
        {/* gráfico */}
        <div className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/8">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <div className="flex h-24 items-end gap-1.5">
            {[30, 70, 85, 20, 45, 15, 25].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-t-md rounded-b-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/8">
          <Skeleton className="h-3 w-36 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-lg" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
        <div className="grid gap-0 rounded-3xl bg-card py-1 ring-1 ring-foreground/8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-11 rounded-2xl" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-3.5 w-3/5 rounded-full" />
                <Skeleton className="h-2.5 w-2/5 rounded-full" />
              </div>
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Esqueleto genérico de página (rutas que cargan). */
export function PageSkeleton() {
  return (
    <div role="status" className="mx-auto grid max-w-2xl gap-4 px-5 py-10">
      <span className="sr-only">Cargando…</span>
      <Skeleton className="h-4 w-28 rounded-full" />
      <Skeleton className="h-9 w-56 rounded-lg" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid gap-2 pt-4">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-11/12 rounded-full" />
          <Skeleton className="h-3 w-4/5 rounded-full" />
        </div>
      ))}
    </div>
  )
}
