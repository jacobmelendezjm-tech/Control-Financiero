"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  catMap,
  eur,
  fmtPlain,
  norm,
  parseMoney,
  parsePos,
  uid,
  ym,
  type Category,
  type Goal,
  type Recurring,
  type Tx,
  type TxType,
} from "@/lib/finance"
import { cn } from "@/lib/utils"

/* ---------- piezas comunes ---------- */
function TypeSwitch({ value, onChange }: { value: TxType; onChange: (t: TxType) => void }) {
  return (
    <div role="group" aria-label="Tipo" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      {(
        [
          ["g", "Gasto"],
          ["i", "Ingreso"],
        ] as const
      ).map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "h-9 rounded-md text-sm font-medium text-muted-foreground transition-colors",
            value === v && "bg-background text-foreground shadow-sm"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: React.ReactNode; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor} className="text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function FormError({ msg }: { msg: string }) {
  return (
    <p role="alert" className="min-h-5 text-sm font-medium text-destructive">
      {msg}
    </p>
  )
}

/** Botón de eliminar que pide un segundo toque para confirmar. */
function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = React.useState(false)
  React.useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <Button type="button" variant="destructive" onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? "¿Seguro? Toca otra vez" : "Eliminar"}
    </Button>
  )
}

function Shell({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function Actions({ onCancel, del }: { onCancel: () => void; del?: () => void }) {
  return (
    <DialogFooter className="sm:justify-between">
      {del ? <DeleteButton onConfirm={del} /> : <span />}
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </DialogFooter>
  )
}

/* ---------- movimiento ---------- */
export interface TxSaveResult {
  tx: Tx
  oldMonth: string | null
  newRec: Recurring | null
}

export function TxDialog({
  open,
  tx,
  cats,
  defaultDate,
  lastType,
  lastCat,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  tx: Tx | null
  cats: Category[]
  defaultDate: string
  lastType: TxType
  lastCat: Partial<Record<TxType, string>>
  onClose: () => void
  onSave: (r: TxSaveResult) => void
  onDelete: (tx: Tx) => void
}) {
  const [type, setType] = React.useState<TxType>(tx ? tx.t : lastType)
  const [cat, setCat] = React.useState<string | null>(tx ? tx.cat : null)
  const [amt, setAmt] = React.useState(tx ? fmtPlain(tx.c) : "")
  const [date, setDate] = React.useState(tx ? tx.d : defaultDate)
  const [note, setNote] = React.useState(tx ? tx.n || "" : "")
  const [rec, setRec] = React.useState(false)
  const [err, setErr] = React.useState("")

  const list = cats.filter((c) => c.t === type)
  const selected = list.some((c) => c.id === cat)
    ? cat
    : list.some((c) => c.id === lastCat[type])
      ? lastCat[type]!
      : null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const c = parsePos(amt)
    if (!c) return setErr("Escribe un importe mayor que 0, por ejemplo 12,50.")
    if (!selected) return setErr("Elige una categoría.")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setErr("Elige una fecha.")
    const n = note.trim().slice(0, 80)
    const nt: Tx = { id: tx ? tx.id : uid(), k: tx ? tx.k || Date.now() : Date.now(), d: date, t: type, c, cat: selected, n }
    if (tx?.rec) nt.rec = tx.rec
    let newRec: Recurring | null = null
    if (!tx && rec) {
      newRec = {
        id: "r" + uid(),
        n: n || catMap(cats)[selected]?.n || "Fijo",
        t: type,
        c,
        cat: selected,
        dia: +date.slice(8),
        on: true,
      }
      nt.rec = newRec.id
    }
    onSave({ tx: nt, oldMonth: tx ? ym(tx.d) : null, newRec })
  }

  return (
    <Shell open={open} onClose={onClose} title={tx ? "Editar movimiento" : "Nuevo movimiento"}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TypeSwitch value={type} onChange={setType} />
        <Field label="Importe" htmlFor="tx-amt">
          <div className="flex items-center gap-2">
            <Input
              id="tx-amt"
              autoFocus
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              className="h-14 font-mono text-2xl font-semibold md:text-2xl"
            />
            <span className="font-mono text-xl text-muted-foreground" aria-hidden>
              €
            </span>
          </div>
        </Field>
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-muted-foreground">Categoría</legend>
          <div className="flex flex-wrap gap-1.5">
            {list.map((c) => (
              <Button
                key={c.id}
                type="button"
                size="sm"
                variant={c.id === selected ? "default" : "outline"}
                aria-pressed={c.id === selected}
                onClick={() => setCat(c.id)}
                className="rounded-full"
              >
                {c.n}
              </Button>
            ))}
          </div>
        </fieldset>
        <Field label="Fecha" htmlFor="tx-date">
          <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field
          label={
            <>
              Nota <span className="font-normal">(opcional)</span>
            </>
          }
          htmlFor="tx-note"
        >
          <Input
            id="tx-note"
            maxLength={80}
            autoComplete="off"
            placeholder="p. ej. Mercadona, abono de tren"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        {tx ? (
          tx.rec ? (
            <p className="text-xs text-muted-foreground">Este movimiento viene de un fijo mensual.</p>
          ) : null
        ) : (
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={rec} onCheckedChange={(v) => setRec(!!v)} />
            Repetir cada mes (lo añade a tus fijos)
          </Label>
        )}
        <FormError msg={err} />
        <Actions onCancel={onClose} del={tx ? () => onDelete(tx) : undefined} />
      </form>
    </Shell>
  )
}

/* ---------- meta ---------- */
export function GoalDialog({
  open,
  goal,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  goal: Goal | null
  onClose: () => void
  onSave: (g: Goal) => void
  onDelete: (g: Goal) => void
}) {
  const [n, setN] = React.useState(goal?.n ?? "")
  const [obj, setObj] = React.useState(goal ? fmtPlain(goal.obj) : "")
  const [ah, setAh] = React.useState(goal ? fmtPlain(goal.ah) : "")
  const [f, setF] = React.useState(goal?.fecha ?? "")
  const [err, setErr] = React.useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const name = n.trim()
    if (!name) return setErr("Ponle un nombre a la meta.")
    const o = parsePos(obj)
    if (!o) return setErr("Escribe cuánto quieres ahorrar, por ejemplo 1000.")
    const a = ah.trim() ? parseMoney(ah) : 0
    if (a == null || a < 0) return setErr("Lo ahorrado tiene que ser 0 o más.")
    if (f && !/^\d{4}-\d{2}$/.test(f)) return setErr("Escribe la fecha como año-mes, por ejemplo 2027-06.")
    const g: Goal = { id: goal ? goal.id : "g" + uid(), n: name.slice(0, 40), obj: o, ah: a }
    if (f) g.fecha = f
    onSave(g)
  }

  return (
    <Shell open={open} onClose={onClose} title={goal ? "Editar meta" : "Nueva meta"}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field label="Nombre" htmlFor="g-n">
          <Input id="g-n" autoFocus maxLength={40} placeholder="p. ej. Fondo de emergencia" value={n} onChange={(e) => setN(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Objetivo (€)" htmlFor="g-obj">
            <Input id="g-obj" inputMode="decimal" autoComplete="off" placeholder="1000" value={obj} onChange={(e) => setObj(e.target.value)} />
          </Field>
          <Field label="Ya ahorrado (€)" htmlFor="g-ah">
            <Input id="g-ah" inputMode="decimal" autoComplete="off" placeholder="0" value={ah} onChange={(e) => setAh(e.target.value)} />
          </Field>
        </div>
        <Field
          label={
            <>
              Fecha objetivo <span className="font-normal">(opcional, mes y año)</span>
            </>
          }
          htmlFor="g-f"
        >
          <Input id="g-f" type="month" placeholder="2027-06" value={f} onChange={(e) => setF(e.target.value)} />
        </Field>
        <FormError msg={err} />
        <Actions onCancel={onClose} del={goal ? () => onDelete(goal) : undefined} />
      </form>
    </Shell>
  )
}

export function AportDialog({
  open,
  goal,
  sign,
  onClose,
  onSave,
}: {
  open: boolean
  goal: Goal
  sign: 1 | -1
  onClose: () => void
  onSave: (amount: number) => void
}) {
  const [amt, setAmt] = React.useState("")
  const [err, setErr] = React.useState("")
  function submit(e: React.FormEvent) {
    e.preventDefault()
    const c = parsePos(amt)
    if (!c) return setErr("Escribe un importe mayor que 0.")
    if (sign < 0 && c > goal.ah) return setErr(`Solo puedes retirar hasta ${eur(goal.ah)}.`)
    onSave(c)
  }
  return (
    <Shell
      open={open}
      onClose={onClose}
      title={`${sign > 0 ? "Aportar a" : "Retirar de"} «${goal.n}»`}
      description={`Ahora llevas ${eur(goal.ah)} de ${eur(goal.obj)}.`}
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field label="Importe" htmlFor="a-amt">
          <Input
            id="a-amt"
            autoFocus
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            className="h-12 font-mono text-xl md:text-xl"
          />
        </Field>
        <FormError msg={err} />
        <Actions onCancel={onClose} />
      </form>
    </Shell>
  )
}

/* ---------- fijo mensual ---------- */
export function RecDialog({
  open,
  rec,
  cats,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  rec: Recurring | null
  cats: Category[]
  onClose: () => void
  onSave: (r: Recurring) => void
  onDelete: (r: Recurring) => void
}) {
  const [type, setType] = React.useState<TxType>(rec?.t ?? "g")
  const [n, setN] = React.useState(rec?.n ?? "")
  const [c, setC] = React.useState(rec ? fmtPlain(rec.c) : "")
  const [dia, setDia] = React.useState(String(rec?.dia ?? 1))
  const [cat, setCat] = React.useState(rec?.cat ?? "")
  const [err, setErr] = React.useState("")
  const list = cats.filter((x) => x.t === type)
  const selCat = list.some((x) => x.id === cat) ? cat : list[0]?.id ?? ""

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const name = n.trim()
    if (!name) return setErr("Ponle un nombre.")
    const amount = parsePos(c)
    if (!amount) return setErr("Escribe un importe mayor que 0.")
    const d = Math.round(+dia)
    if (!(d >= 1 && d <= 31)) return setErr("El día tiene que estar entre 1 y 31.")
    onSave({ id: rec ? rec.id : "r" + uid(), n: name.slice(0, 40), t: type, c: amount, cat: selCat, dia: d, on: rec ? rec.on !== false : true })
  }

  return (
    <Shell open={open} onClose={onClose} title={rec ? "Editar fijo mensual" : "Nuevo fijo mensual"}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TypeSwitch value={type} onChange={setType} />
        <Field label="Nombre" htmlFor="r-n">
          <Input id="r-n" autoFocus maxLength={40} placeholder="p. ej. Tarifa móvil" value={n} onChange={(e) => setN(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Importe (€)" htmlFor="r-c">
            <Input id="r-c" inputMode="decimal" autoComplete="off" placeholder="15" value={c} onChange={(e) => setC(e.target.value)} />
          </Field>
          <Field label="Día del mes" htmlFor="r-d">
            <Input id="r-d" type="number" min={1} max={31} inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} />
          </Field>
        </div>
        <Field label="Categoría" htmlFor="r-cat">
          <NativeSelect id="r-cat" value={selCat} onChange={setCat} options={list.map((x) => ({ value: x.id, label: x.n }))} />
        </Field>
        <FormError msg={err} />
        <Actions onCancel={onClose} del={rec ? () => onDelete(rec) : undefined} />
      </form>
    </Shell>
  )
}

/* ---------- categoría ---------- */
export function CatDialog({
  open,
  cats,
  onClose,
  onSave,
}: {
  open: boolean
  cats: Category[]
  onClose: () => void
  onSave: (c: Category) => void
}) {
  const [type, setType] = React.useState<TxType>("g")
  const [n, setN] = React.useState("")
  const [g, setG] = React.useState<"nec" | "des">("des")
  const [err, setErr] = React.useState("")
  function submit(e: React.FormEvent) {
    e.preventDefault()
    const name = n.trim()
    if (!name) return setErr("Ponle un nombre.")
    if (cats.some((c) => c.t === type && norm(c.n) === norm(name))) return setErr("Ya tienes una categoría con ese nombre.")
    const c: Category = { id: "c" + uid(), n: name.slice(0, 40), t: type }
    if (type === "g") c.g = g
    onSave(c)
  }
  return (
    <Shell open={open} onClose={onClose} title="Nueva categoría">
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TypeSwitch value={type} onChange={setType} />
        <Field label="Nombre" htmlFor="c-n">
          <Input id="c-n" autoFocus maxLength={40} placeholder="p. ej. Gimnasio" value={n} onChange={(e) => setN(e.target.value)} />
        </Field>
        {type === "g" ? (
          <Field label="Cuenta como" htmlFor="c-g">
            <NativeSelect
              id="c-g"
              value={g}
              onChange={(v) => setG(v as "nec" | "des")}
              options={[
                { value: "nec", label: "Necesidad" },
                { value: "des", label: "Deseo" },
              ]}
            />
          </Field>
        ) : null}
        <FormError msg={err} />
        <Actions onCancel={onClose} />
      </form>
    </Shell>
  )
}

/* ---------- confirmación ---------- */
export function ConfirmDialog({
  open,
  title,
  children,
  yes,
  danger,
  onClose,
  onYes,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  yes: string
  danger?: boolean
  onClose: () => void
  onYes: () => void
}) {
  return (
    <Shell open={open} onClose={onClose} title={title} description={children}>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={danger ? "destructive" : "default"} onClick={onYes}>
          {yes}
        </Button>
      </DialogFooter>
    </Shell>
  )
}

export function TextDialog({ open, title, text, onClose }: { open: boolean; title: string; text: string; onClose: () => void }) {
  return (
    <Shell open={open} onClose={onClose} title={title} description="Selecciona el texto y cópialo.">
      <textarea readOnly rows={10} value={text} className="w-full rounded-lg border bg-muted/40 p-2 font-mono text-xs" />
      <DialogFooter>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogFooter>
    </Shell>
  )
}

/* Select nativo con el estilo de los inputs: más fiable en móvil para listas largas. */
export function NativeSelect({
  id,
  value,
  onChange,
  options,
  className,
  ...rest
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
} & Omit<React.ComponentProps<"select">, "onChange" | "value">) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
        className
      )}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
