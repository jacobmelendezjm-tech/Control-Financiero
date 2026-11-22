<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Orbe · instrucciones del proyecto

- Antes de empezar, lee `memory.md` (estado y decisiones), `supabase/README.md` (base de datos y sincronización) y la última entrada de `avances.md`.
- Todo en **español de España**: textos de la app, commits, comentarios y documentación. Tono cercano.
- Colores y tipografías solo con los tokens de `app/globals.css`; no meter colores sueltos en las clases salvo los de marca ya usados.
- Datos: la app es local primero (`localStorage`, `hooks/use-finance.ts`). Si cambias el modelo, actualiza a la vez `lib/finance.ts` (`loadAll`), `lib/cloud-rows.ts` (`toRows`/`fromRows`, la ida y vuelta debe ser idéntica) y crea una migración nueva en `supabase/migrations/` (no edites las ya aplicadas).
- Importes siempre en céntimos (enteros).
- Comprueba antes de cada commit: `npm run lint`, `npx tsc --noEmit`, `npm run build`, y prueba en el navegador a 390 px y a 1440 px.
- Sube a las dos ramas: `git push origin main` y `git push origin main:claude/deploy-finanzas-github-vercel-o8097c`. Vercel despliega solo.
- Al cerrar una sesión, añade una entrada a `avances.md` y actualiza `memory.md`.
