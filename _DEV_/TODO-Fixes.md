# LaserBench Commercial Readiness — TODO

Generated from full codebase review. Prioritized by impact.

---

## Phase 1 — Clean Up (ship blockers)

- [x] Exclude `_DEV_/` from vitest config to stop 14 stale "Invalid hook call" errors
- [x] Fix `keyboardShortcuts.test.tsx` fc.property timeout (stale closure in `TabTestApp`)
- [x] Fix `machineSelector.test.tsx` fc.property timeout (missing `act()` around DOM reads)
- [x] Remove global `*` CSS transition in `index.css:6` — apply transitions per-component

## Phase 2 — Safety (security, crash recovery)

- [x] Add ErrorBoundary wrapping `<App />` in `main.tsx`
- [x] Wrap `navigator.clipboard.writeText()` in try/catch — `GCodeOutput.tsx:45`, `GCodeDictionary.tsx:251`
- [x] Wrap `localStorage.setItem()` in try/catch — `materialPresets.ts:215,232`
- [x] Replace `dangerouslySetInnerHTML` with React `<path>` elements — `SVGVisualizer.tsx:632`
- [x] Replace `window.confirm()` with custom confirmation modal — `MachineSelector.tsx:204`, `MaterialDatabase.tsx:135,381`, `PresetManager.tsx:251`

## Phase 3 — Type Safety

- [x] Type `useWebSerial.ts` refs properly (`SerialPort`, `ReadableStreamDefaultReader`, `WritableStreamDefaultWriter`) instead of `any`
- [x] Replace `value: any` in `MachineSelector.tsx:72` with `MachineProfile[K]` mapped type
- [x] Replace `field: string, value: any` in `MaterialDatabase.tsx:62` with proper keyof types
- [x] Replace `icon: any` in `WorkflowStepper.tsx:11`, `MainCanvas.tsx:18`, `PatternConfigurator.tsx:72` with `LucideIcon` type
- [x] Cast `e.target.value` to union types for `bedShape` — `MachineSelector.tsx:372`
- [x] Add explicit return types to exported lib functions (`gcodeGenerator.ts:62`, etc.)
- [x] Remove unnecessary `import React` from `GCodeOutput.tsx`, `PatternConfigurator.tsx`, `PresetManager.tsx`, `SVGVisualizer.tsx`

## Phase 4 — UX & Accessibility

- [x] Add `role="dialog"` and `aria-modal="true"` to `GCodeDictionary` and `QuickLogModal`
- [x] Implement focus trap in modals (trap Tab, return focus on close)
- [x] Add `aria-label` to icon-only buttons: GCodeDictionary close, PrinterConsole jog, StatusBar connection, SVGVisualizer zoom
- [x] Add skip-to-content link for keyboard users
- [x] Debounce slider inputs in `PatternConfigurator` (150-300ms)
- [x] Fix `QuickLogModal` stale state on reopen — sync with `useEffect` when `open` becomes true
- [x] Add input validation feedback for `parseInt` fields (radix 10, min/max clamping)

## Phase 5 — Performance

- [x] Wrap `PatternConfigurator`, `GCodeOutput`, `SVGVisualizer` in `React.memo`
- [x] Memoize `estimateMotionStats()` in `GCodeOutput.tsx:66-104` with `useMemo`
- [x] Memoize `gcode.split('\n')` in `GCodeOutput.tsx:251`
- [x] Memoize SVG legend path filtering in `SVGVisualizer.tsx:846-863`
- [x] Extract shared download utility (deduplicate `GCodeOutput.tsx:50-63` and `App.tsx:248-259`)

## Phase 6 — Tests

- [x] Replace manual `document.body.innerHTML = ''` with `cleanup()` from `@testing-library/react`
- [x] Replace CSS class assertions with `toBeVisible()` / `toHaveStyle()` matchers
- [x] Delete vacuous `presetLoadCenterTab` fc.property test, replace with real component test
- [x] Add unit tests for `gcodeGenerator.ts` (all 5 patterns, SVG output, G-code header/footer)
- [x] Add unit tests for `deltaKinematics.ts` (`isReachable`, `inverseKinematics`)
- [x] Add unit tests for `timeEstimator.ts` (empty paths, zero acceleration, single-point)
- [x] Add unit tests for `materialPresets.ts` (localStorage round-trip, JSON parse errors)
- [x] Add unit tests for `vectorFont.ts` (character rendering, unknown char fallback)
- [x] Add component tests for `GCodeOutput` (copy, download, line toggle, print state)
- [x] Add component tests for `QuickLogModal` (form submit, validation, open/close)

## Phase 7 — Polish

- [x] Unify export style (all `export default function`)
- [x] Remove dead props `activeTab`/`onTabChange` from `CenterPanel`
- [x] Remove trivial `Workspace.tsx` wrapper (inline the div)
- [x] Add `<meta name="description">`, `<meta name="theme-color">`, favicon, OG tags to `index.html`
- [x] Remove unused `useState` import from `CenterPanel.tsx`
