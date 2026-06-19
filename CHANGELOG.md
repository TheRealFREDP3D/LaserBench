# Changelog

All notable changes to LaserBench are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.4.1] — 2026-06-19

### Added
- **ErrorBoundary** wrapping `<App />` — catches render crashes with fallback UI instead of white screen
- **Custom ConfirmModal** component (`role="alertdialog"`) replacing all native `window.confirm()` calls with an accessible, focus-trapped dialog
- **`useConfirmModal` hook** — Promise-based confirm helper used by MachineSelector, MaterialDatabase, PresetManager
- **`useFocusTrap` hook** — traps Tab cycling inside modals and restores focus on close
- **`DebouncedRange` component** — 200ms debounced range input for all 8 sliders in PatternConfigurator
- **`downloadGCode` utility** — shared download logic extracted from GCodeOutput and App
- **Web Serial API type declarations** (`src/types/web-serial.d.ts`) — minimal `SerialPort`, `ReadableStreamDefaultReader`, `WritableStreamDefaultWriter` types
- **Skip-to-content link** for keyboard navigation
- **`<meta name="description">`**, **`<meta name="theme-color">`**, **OG tags**, and **SVG favicon** in `index.html`
- **Unit tests** for `gcodeGenerator.ts` (29 tests across all 5 patterns), `deltaKinematics.ts` (8 tests), `timeEstimator.ts` (9 tests), `materialPresets.ts` (9 tests including localStorage round-trip + JSON parse errors), `vectorFont.ts` (9 tests)
- **Component tests** for GCodeOutput (9 tests: stats, line numbers, copy, download, print) and QuickLogModal (10 tests: open/close, aria, form submit, context display)

### Changed
- **Test suite expanded** from 32 to 122 tests across 14 files
- **PatternConfigurator** wrapped in `React.memo` — avoids re-rendering 8 sliders on unrelated state changes
- **GCodeOutput** wrapped in `React.memo` — `useMemo` for `estimateMotionStats`, `gcode.split('\n')`, laser path filtering
- **SVGVisualizer** wrapped in `React.memo` — `useMemo` for laser path filtering
- **All icon arrays** typed with `LucideIcon` instead of `any` (WorkflowStepper, MainCanvas, PatternConfigurator)
- **All test files** now use `cleanup()` from `@testing-library/react` instead of manual `document.body.innerHTML = ''`
- **`classList.contains()` assertions** replaced with idiomatic `toHaveClass()` / `.not.toHaveClass()` matchers
- **`parseInt` calls** — all include radix `10`; speed inputs clamped to declared `min`/`max` range

### Fixed
- **Flaky `fc.property` tests** — `keyboardShortcuts.test.tsx` (stale closure in TabTestApp) and `machineSelector.test.tsx` (missing `act()` around DOM reads) now stable with `fireEvent` and timeout guards
- **Global CSS transition** removed — `* { transition: all 0.2s }` was causing unintended animation on all elements
- **`dangerouslySetInnerHTML` eliminated** — SVGVisualizer now renders paths via typed `SvgPathElement[]` objects
- **QuickLogModal stale state** — optimal values reset when modal reopens with different param snapshot
- **Dead props removed** — `activeTab`/`onTabChange` removed from CenterPanel (tab concept replaced by preset flyout)
- **Workspace wrapper inlined** — trivial `Workspace.tsx` wrapper deleted, div moved directly into App.tsx
- **Unused React imports removed** from 7 files (GCodeOutput, PatternConfigurator, PresetManager, SVGVisualizer, CenterPanel, StatusBar, WorkflowStepper)

### Removed
- `design.md`, `metadata.json`, `requirements.md`, `tasks.md` — legacy design/planning files
- `package-lock.json` — project uses pnpm (pnpm-lock.yaml is gitignored)
- `_DEV_/` tests excluded from vitest config (archive directory, not deleted)

---

## [0.3.1] — 2026-06-18

### Added
- Delta kinematics validation (isReachable, inverseKinematics, getMaxRadius) for circular bed machines
- Keyboard shortcuts (1-6 for pattern selection, L for quick log, Esc for modals)
- Layout shell: LeftSidebar, CenterPanel, MainCanvas, StatusBar, GenerateFAB
- Collapsible MaterialDatabase with category tabs
- Property-based tests with fast-check for sidebar tabs, FAB state, canvas views, status bar
- MachineSelector collapsible sections with section toggle invariant

### Changed
- MachineSelector delta parameters now validate pattern reachability before G-code generation
- Material presets persisted to localStorage with JSON parse error handling

---

## [0.2.0] — 2026-06-17

### Added
- G-code generation for 5 pattern types: matrix, power_ramp, speed_ramp, focus_ladder, kerf_test
- SVG toolpath preview with zoom/fit controls
- Web Serial API integration for machine communication
- Material calibration database with engrave/cut power/speed profiles
- Machine profile manager with GRBL/Marlin firmware support

---

## [0.1.0] — 2026-06-16

### Added
- Initial project scaffolding — React 19, Vite 6, TypeScript 5.8, Tailwind v4
- Basic pattern configurator UI
