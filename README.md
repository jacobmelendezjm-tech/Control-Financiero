# Orbe · Control financiero

App web instalable (PWA) para llevar las finanzas personales desde el móvil.

- Ingresos, gastos, categorías, presupuestos y gastos fijos mensuales
- Gastos hormiga: detección automática, proyección anual y equivalencia en horas de trabajo
- Ahorro y metas
- Trabajo: jornadas por día, semana y mes, horas extra, vacaciones, festivos y bajas
- Nóminas: bruto, IRPF, Seguridad Social y neto, con resumen anual
- Exportar e importar CSV y copias completas en JSON

Los datos se guardan solo en el navegador del dispositivo (localStorage).

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # compilación de producción
npm run typecheck
```

Hecho con Next.js 16, React 19, Tailwind CSS 4 y shadcn/ui.
