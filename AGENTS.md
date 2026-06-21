# AGENTS.md — LaserBench

## What this is

React 19 + Vite 6 + TypeScript 5.8 single-page app for laser cutter calibration. G-code generation, SVG toolpath preview, serial communication (Web Serial API). Not a monorepo.

## Commands

| Task | Command |
|------|---------|
| Dev server (port 3000) | `pnpm dev` |
| Type-check (the only linter) | `pnpm lint` → runs `tsc --noEmit` |
| Run all tests | `pnpm test` → runs `vitest --run` |
| Run single test file | `pnpm test src/test/keyboardShortcuts.test.tsx` |
| Build | `pnpm build` → `vite build` → output to `dist/` |
| Clean | `pnpm clean` → removes `dist/` and `server.js` |

No eslint, prettier, or biome. `pnpm lint` (tsc) is the only static check.

## Verification order

`pnpm lint` → `pnpm test` → `pnpm build`

## Package manager

Use `pnpm`. The `pnpm-workspace.yaml` only sets build allowlists (`esbuild`, `protobufjs`) — it is NOT a monorepo.

## Path alias

`@/*` maps to project root (e.g. `@/src/components/...`). Defined in both `tsconfig.json` and `vite.config.ts`.

## Project structure

```
src/
  main.tsx          ← entry point
  App.tsx           ← root component, holds all state
  types.ts          ← shared TypeScript interfaces
  index.css         ← Tailwind v4 imports + theme CSS
  lib/              ← business logic (no React components)
    gcodeGenerator.ts   ← pattern generation + G-code output
    materialPresets.ts  ← default machines/materials + localStorage persistence
    deltaKinematics.ts  ← delta reachability checks
    timeEstimator.ts    ← toolpath time estimation
    useWebSerial.ts     ← Web Serial API hook
    vectorFont.ts       ← text rendering for SVG
  components/       ← React components
    layout/         ← layout shell (Workspace, LeftSidebar, CenterPanel, MainCanvas, StatusBar, GenerateFAB, WorkflowStepper)
    MachineSelector.tsx
    MaterialDatabase.tsx
    PatternConfigurator.tsx
    PresetManager.tsx
    SVGVisualizer.tsx
    GCodeOutput.tsx
    PrinterConsole.tsx
    GCodeDictionary.tsx
    QuickLogModal.tsx
  test/             ← vitest test files (*.test.tsx)
```

## Testing

- Framework: Vitest with jsdom environment, globals enabled
- Setup file: `src/test/setup.ts` (imports `@testing-library/jest-dom/vitest`)
- Libraries: `@testing-library/react`, `@testing-library/user-event`, `fast-check` (property-based)
- Tests use mini harness components (not full App) to isolate behavior
- Test file naming: `src/test/<feature>.test.tsx`
- `_DEV_/` is excluded in `vitest.config.ts` — stale archive tests live there

## Key conventions

- All state lives in `App.tsx` and is passed down as props — no context providers, no state management library
- Persistence: `localStorage` via `getStoredMachines()` / `saveStoredMachines()` / `getStoredMaterials()` / `saveStoredMaterials()` in `lib/materialPresets.ts`
- Tailwind v4: use `@import "tailwindcss"` (not `@tailwind` directives). Theme fonts defined via `@theme {}` block in `index.css`
- No `.env` required (`.env.example` is a placeholder)
- Web Serial API requires Chrome/Edge 89+ — no polyfill, no fallback
- `DISABLE_HMR` env var disables HMR + file watching (used in AI Studio to prevent flicker during edits)

## Gotchas

- `pnpm-lock.yaml` is gitignored — run `pnpm install` to regenerate
- `pnpm-workspace.yaml` is also gitignored but checked in — do not delete it
- Tests run with `--run` (single pass, no watch). No coverage by default.
- `tsc --noEmit` is the full type-checker; there are no separate lint rules
- Keyboard shortcuts (1-6, L, Esc) are wired in `App.tsx` and skip editable elements (input/textarea/select)
