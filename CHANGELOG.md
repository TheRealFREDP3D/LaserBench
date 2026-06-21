# Changelog

All notable changes to LaserBench are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.6.0] — 2026-06-21

### Added
- **`baudRate` field on `MachineProfile`** — serial baud rate is now a per-machine setting (default 250000). Users can configure 115200, 57600, etc. from the Machine Selector editor without editing code
- **`usePatternParams` hook** — extracts 13 pattern config state variables, setters, and `loadPreset()` from App.tsx
- **`useMachineStore` hook** — extracts machine CRUD, selection, and localStorage persistence from App.tsx
- **`useMaterialStore` hook** — extracts material CRUD, selection, and localStorage persistence from App.tsx

### Changed
- **App.tsx refactored** from 695 → 602 lines. State management delegated to three custom hooks; App.tsx now owns only UI chrome, generation effects, keyboard shortcuts, and JSX layout
- **Version string** derived from `package.json` via Vite `define` (`__APP_VERSION__`) — single source of truth, no more hardcoded version in the header
- **MachineSelector editor** grid expanded from 3 to 4 columns to accommodate the new Baud Rate field

### Removed
- **`@google/genai` dependency** — unused, added ~400 KB of transitive packages. Removed from `package.json`, `pnpm-workspace.yaml` allowBuilds, and `AGENTS.md`
- **`dotenv` dependency** — Node.js library with no effect in Vite browser bundles. Vite handles env vars via `import.meta.env` natively

### Fixed
- **Serial disconnect error recovery** — `readLoop` catch block now resets `isConnected`, `isPrinting`, and `connectionState`, and drains pending buffer waiters. A cable pull mid-print no longer leaves the UI stuck in "printing" state
- **Negative parameter values** — all machine and material numeric inputs now enforce `min="0"` (or `min="0.1"` for thickness). Default presets clamped to non-negative. Prevents invalid G-code generation from negative Z/power/speed values

---

## [0.5.0] — 2026-06-19

### Changed
- **2-row layout** — config panels (Machine, Material, Pattern) on top at 42% height, output (SVG Preview + G-Code/Operate tabs) on bottom. UI no longer scrolls; everything fits on screen
- **SVGVisualizer simulation controls** moved to a compact single-row toolbar above the canvas (Enable Sim, Reset, Play/Pause, Step±, scrubber, speed, live step info). Old multi-row panel below canvas removed
- **SVGVisualizer header** compacted — smaller text, tighter spacing, zoom buttons reduced
- **SVGVisualizer legend** compacted — single-row wrapping layout, smaller text
- **MainCanvas** reduced from 3 views to 2 (`code` | `operate`). Preview tab removed since SVGVisualizer is always visible in the left panel. Children array contract changed from `[SVGVisualizer, GCodeOutput, PrinterConsole]` to `[GCodeOutput, PrinterConsole]`
- **Keyboard shortcuts** updated — keys `1`/`2` scroll to machine/material cards, key `4` switches to code view (matching WorkflowStepper "Preview" step), key `3` closes preset flyout, keys `5`/`6` switch code/operate
- **WorkflowStepper** navigation now scrolls to the relevant card section instead of setting sidebarTab
- **MachineSelector** compacted — reduced padding (`p-5`→`p-3`), tighter spacing, smaller empty state hint
- **MaterialDatabase** compacted — single-column layout, full material names visible (no truncation), tighter category tabs
- **PatternConfigurator** compacted — smaller pattern cards, tighter parameter form, reduced padding
- **Version string** in header updated from `v1.4-ui` to `v0.4.3`

### Removed
- **LeftSidebar** component — replaced by inline config panels in the 2-row layout
- **CenterPanel** component — preset flyout now rendered inline in Pattern column header
- **Mobile hamburger sidebar** — `sidebarOpen` state and hamburger button removed (no sidebar to toggle)
- **`sidebarTab` state** — no longer needed; machine/material sections are always visible in the top row
- Unused imports: `Play`, `ChevronRight` from PatternConfigurator; `Menu` from App.tsx

### Fixed
- **SVGVisualizer preview controls hidden** — simulation controls (Reset, Play, Stop, Speed) were below the visible area due to SVG canvas consuming all parent space. Moved to top toolbar with `shrink-0` so they're always visible
- **MainCanvas contract violation** — children array now matches the 2-view structure
- **Duplicate skip-to-content links** — consolidated to single link
- **Stale keyboard shortcut comments** — cleaned up duplicate old/new mapping
- **Redundant ternary** in `onViewChange` — `v === 'code' ? 'burn' : 'burn'` simplified to `setLastTouched('burn')`

### Tests
- **layoutShell.test.tsx** — rewritten for 2-view MainCanvas contract (`code` | `operate`)
- **keyboardShortcuts.test.tsx** — updated harness to match new shortcuts (scroll-to-section, no sidebarTab)
- **machineSelector.test.tsx** — removed Property 2 (sidebarTab invariance) tests and unused imports

---

## [0.4.3] — 2026-06-19

### Added
- **`abortPrint` function** in `useWebSerial` — user can cancel an in-progress print via new **Abort Print** button in PrinterConsole
- **Slot-based serial buffer** (`BUFFER_SIZE=4`) replacing single-ok flow control — sends up to 4 G-code lines before waiting for acknowledgement, with drain logic to wait for all in-flight commands before marking print complete
- **`React.memo` wrappers** on MachineSelector, MaterialDatabase, PresetManager, and PrinterConsole — prevents re-renders when parent state unrelated to these components changes
- **`useCallback` wrappers** on all CRUD handlers in `App.tsx` (handleUpdateMachine, handleCreateMachine, handleDeleteMachine, handleUpdateMaterial, handleCreateMaterial, handleDeleteMaterial, handleDownloadGCode, handlePrint, handleQuickLogSave, handleStageClick)
- **Apache 2.0 LICENSE** file

### Changed
- **PrinterConsole** progress bar layout — percentage label and abort button shown side-by-side below the bar
- **README** logo reference updated from `logo.jpg` to `header.jpg`

### Fixed
- **Print reliability** — abort resolves all pending buffer-slot promises and resets state cleanly on disconnect or error

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
