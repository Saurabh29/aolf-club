# Copilot instructions for this repository

This repository is a small SolidStart (SolidJS) application scaffolded with the Solid CLI and configured to use TailwindCSS.

Purpose for AI agents
- Help developers work on a SolidStart app that uses `vinxi` dev/build/start scripts and `@solidjs/start` runtime.
- Make small, scoped changes (components, routes, styles) and provide runnable guidance for testing locally.

Big-picture architecture (quick)
- Entrypoints:
  - `src/entry-server.tsx` — server-side handler using `StartServer` (HTML document template).
  - `src/entry-client.tsx` — client mount using `StartClient`.
  - `src/app.tsx` — top-level app that wires `Router` and `FileRoutes`.
- Routing: `src/routes/*` are file-based routes loaded by `FileRoutes` from `@solidjs/start/router`.
- Components: `src/components/*` contains UI components (e.g., `Nav.tsx`, `Counter.tsx`).

Key developer workflows (how to run & test)
- Local dev: `pnpm install` then `pnpm run dev` (package.json uses `vinxi dev`).
- Build: `pnpm run build` (runs `vinxi build`).
- Start production: `pnpm run start` (runs `vinxi start`).
- Node requirement: Node >= 22 as declared in `package.json` `engines`.

Project-specific conventions & patterns
- File-based routing: add files under `src/routes` to create routes. Use default exports for route components.
- Use `~` import alias for `src` (seen in `import Nav from "~/components/Nav"`). Respect these paths when editing imports.
- Styling: Tailwind classes are used in-line; `app.config.ts` adds the Tailwind Vite plugin.
- Minimal suspense: `app.tsx` wraps route children with `Suspense` — prefer to return Resolving resources inside routes or components.

Integration points & dependencies
- `@solidjs/start` — provides `StartClient`, `StartServer`, `FileRoutes`, and router integration.
- `vinxi` — CLI that runs development, build and start processes per scripts in `package.json`.
- TailwindCSS — configured via `app.config.ts` with `@tailwindcss/vite` plugin.

Patterns to follow when editing
- Keep changes small and focused — this is a starter app. Update or add one route/component per PR.
- Match the import style: prefer `import X from "~/..."` for local modules.
- When updating routes, remember `FileRoutes` auto-loads files — no extra router registration required.

Files to inspect for common tasks
- App shell & routing: `src/app.tsx`
- Client/server entrypoints: `src/entry-client.tsx`, `src/entry-server.tsx`
- Routes: `src/routes/*.tsx` (e.g., `index.tsx`, `about.tsx`)
- Components: `src/components/*.tsx` (e.g., `Nav.tsx`, `Counter.tsx`)
- Config: `app.config.ts`, `package.json`, `tsconfig.json`

Examples (copyable)
- Add a new page: create `src/routes/contact.tsx` with a default export component. `FileRoutes` will pick it up.
- Link to a route: use `A` from `@solidjs/router` (see `about.tsx` usage).

What not to change without extra context
- Do not replace the `StartServer` document template in `src/entry-server.tsx` with custom document structure without checking server hosting needs.
- Avoid changing `pnpm`/`vinxi` scripts unless adding clearly needed tasks (e.g., `test`).

If you need more info
- Run the dev server locally to infer runtime behaviour: `pnpm install && pnpm run dev`.
- Ask the repo owner which bundler/preset is intended for production (SolidStart supports multiple presets).

If you modify this file
- Keep it concise and focused on repository-specific behaviors and commands.

---
Please review and tell me which areas you'd like expanded (tests, CI, deploy presets, or component conventions).
