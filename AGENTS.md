# LaserBench — Agent Guide

## Commands
| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server on `localhost:3000` (0.0.0.0) |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | `tsc --noEmit` (only typecheck, no ESLint/Prettier) |
| `npm run preview` | Vite preview of built output |
| `npm run clean` | Deletes `dist/` and `server.js` |

No test framework is configured yet (vitest + fast-check are planned in `tasks.md`).

## Tech Stack
- **Vite 6** + **React 19** + **TypeScript ~5.8** + **Tailwind CSS v4**
- `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `target: ES2022`
- Tailwind v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js` or PostCSS config
- Path alias `@/*` → project root (e.g. `@/src/App.tsx`)
- `type: "module"` in package.json

## Architecture
- Single-page app; **all state in `App.tsx`** via hooks, drilled as props (no external state lib)
- 3-column layout: Machine/Material (left) | Pattern/Presets (center) | SVG/GCode/Console (right)
- Components in `src/components/`, library modules in `src/lib/`
- Material/machine profiles persisted to `localStorage` (`laserbench_materials`, `laserbench_machines`)
- `design.md` and `tasks.md` describe the planned UI redesign (layout shell, collapsible sections, FAB, status bar)

## Development Quirks
- **HMR flickers during agent edits** — set `DISABLE_HMR=true` env var to disable file watching + HMR
- Web Serial API only works in **Chrome/Edge/Opera** (not Firefox/Safari)
- No `.env` variables currently required (see `.env.example`)
- Only `package-lock.json` is tracked; `pnpm-lock.yaml` and `pnpm-workspace.yaml` are gitignored
- `_DEV_/` and `.kiro/` directories are gitignored
