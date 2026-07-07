# Changelog

All notable changes to LaserBench are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.8.2] — 2026-07-05

### Fixed
- **Preview cursor tracking** — removed inverted Y-axis on the hover crosshair in SVGVisualizer caused by double-negation against the CSS `scaleY(-1)` flip

---

## [0.8.0] — 2026-06-29

### Added
- **`useSerialStore`** — consolidated Web Serial logic (connect, disconnect, send, print, abort, flow control) into a single Zustand store at `src/store/useSerialStore.ts`. Replaces `useWebSerial` hook
- **Docker Compose files** — `compose.yaml` (production) and `compose.debug.yaml` (debug) for containerized deployment
- **Additional tests** — expanded from 198 to 277 tests across 23 files. New coverage for `downloadGCode`, `gcodeFileUpload`, `useConfirmModal`, `themeContext`, `layoutShell`, `statusBar`, `machineSelector`, `materialDatabase`, `keyboardShortcuts`, `gcodeOutput`, and `generateFAB`

### Changed
- **G-code incremental positioning** — switched from absolute to incremental positioning (`G91`) with end-of-file absolute restore. Laser on/off commands updated for bidirectional mode
- **Laser power logic** — improved power ramp and speed ramp generation with tighter per-block control
- **Dockerfile simplified** — production-only build, reduced layers, `node:22-alpine`, exposed port 3000, non-root user
- **`.gitignore` hardened** — added patterns for `.vscode`, `.vault-intelligence`, build artifacts, and `_DEV_/` directory (with trailing slash fix)
- **CSP `font-src`** — added `fonts.googleapis.com` and `fonts.gstatic.com` to `index.html` Content Security Policy
- **ESLint config** — migrated to flat config format (`eslint.config.js`)
- **CSS overhaul** — refactored `index.css` for tighter spacing and improved dark/light theme consistency
- **Test infrastructure** — `vitest.config.ts` alias path fix, `themeContext.test.tsx` and `useConfirmModal.test.tsx` added

### Removed
- **`useWebSerial` hook** — deleted `src/lib/useWebSerial.ts` (328 lines). All serial logic now lives in `useSerialStore`
- **Stale `.gcode` files** — removed `laserbench_matrix_birch_plywood_3mm.gcode` and `matrix_lightburn.gc` from repo

### Fixed
- **Ring buffer HMR singleton** — `ringBuffer` moved inside `create()` closure so it's recreated on hot-reload, preventing message divergence between ring buffer and store state
- **`addMessage` forward reference** — eliminated fragile coupling to `useSerialStore` by assigning `addMessage` inside the store creator using `get`/`set` parameters
- **Machine selector validation** — improved `isValidMachineProfile` checks
- **Batch import dedup** — profile import uses id-based deduplication to prevent duplicate entries

---

## [0.7.2] — 2026-06-25

### Added
- **Clipboard profile copy/paste** — `copyProfileToClipboard()` and `importProfilesFromClipboard()` in `profileExport.ts`. Copy/Paste buttons (Copy, ClipboardPaste icons) in MachineSelector and MaterialDatabase headers for quick profile sharing
- **Console subcomponents** — extracted `JogControls`, `FireControls`, `SerialLog` from PrinterConsole into `src/components/console/` for cleaner separation of concerns
- **`uploaded` pattern type** — new `PatternType` variant for uploaded G-code files

### Changed
- **PrinterConsole refactored** — reduced from ~430 lines by extracting jog/fire/serial-log into dedicated components. All handlers wrapped in `useCallback` for better performance
- **SVGVisualizer pointer events** — switched from `Mouse` to `Pointer` events (`onPointerDown/Move/Up/Leave`) for better touch/pen/stylus support
- **G-code generator constants** — extracted magic numbers to named constants (`POWER_RAMP_LENGTH_MM`, `SPEED_RAMP_LINE_GAP_MM`, `MATRIX_BLOCK_GAP_MM`, `LABEL_TEXT_SCALE`, etc.)
- **App.tsx file upload** — changed `handleFileUpload` from `Event` to `ChangeEvent<HTMLInputElement>` for proper React typing
- **Package.json** — removed `express` from dependencies, moved `@tailwindcss/vite` to devDependencies, added `@types/react` and `@types/react-dom`, added `zustand` as explicit dependency
- **tsconfig.json** — enabled `strict: true`
- **Dockerfile** — healthcheck uses `127.0.0.1` instead of `localhost`; added `pnpm-workspace.yaml` back to COPY step
- **Clean script** — removed `server.js` from `clean` target

---

## [0.7.1] — 2026-06-25

### Added
- **Keyboard shortcuts** — `Ctrl+Esc` (E-STOP), `Esc` (abort print), `H` (home), `F` (hold to fire), arrow keys (jog XY), `C` (connect/disconnect). `<kbd>` badges on UI buttons. New `useKeyboardShortcuts` hook
- **Auto-scroll pause in console** — scroll up to pause, click `⬇ AUTO` / `⏸ PAUSED` badge to toggle. Log messages still arrive; only scrolling is suppressed while paused
- **Delete confirmation on materials** — MaterialDatabase trash button now uses `useConfirmModal` with "cannot be undone" warning (MachineSelector already had this)
- **G-code file upload** — new `parseGCode()` parser and `gcodeFileUpload.ts` utility. Upload button in preview step accepts `.gcode`, `.nc`, `.gc` files
- **Inline G-code editing** — GCodeOutput has pencil/check/cancel/reset buttons and textarea editor. Edited G-code re-parses for SVG visualization and time estimation
- **Movement mode tracking** — StatusBar shows `Absolute`/`Incremental` badge from G90/G91 tracking in `useWebSerial`
- **Baud rate dropdown** — MachineSelector now offers 250000, 230400, 115200, 57600, 9600 baud rates
- **Profile import/export** — `exportAllProfiles()`, `exportSelectedProfile()`, `importMachineProfilesFromFile()`, `importMaterialProfilesFromFile()` with versioned JSON envelope format. Export/import buttons in MachineSelector and MaterialDatabase
- **Onboarding tooltips** — 5-step walkthrough (Machine → Material → Pattern → Preview → Connect) with `data-tour` attributes, localStorage persistence, theme-aware
- **CSP meta tag** — Content Security Policy in `index.html` covering script, style, img, connect, font, object, base-uri, form-action, frame-ancestors, worker-src
- **Favicon installation** — RealFaviconGenerator files in `public/`, proper `<link>` tags in `index.html`
- **GitHub Actions CI** — lint + test + build workflow on push/PR to main, uploads dist artifact
- **LICENSE** — MIT license
- **`.nvmrc`** — locks Node.js version to 22
- **`engines` field** in `package.json` — `"node": ">=18"`
- **Test suite expansion** — from 48 to 198 tests across 19 files:
  - `gcodeGenerator.test.ts` (34 tests): all 5 pattern types, G-code structure, laser modes, delta, kerf, edge cases
  - `gcodeParser.test.ts` (21 tests): G0/G1/G28/G92, M3/M5/M106/M107, G90/G91, bounds, comments
  - `timeEstimator.test.ts` (19 tests): trapezoid model, formatting, edge cases
  - `materialPresets.test.ts` (38 tests): validation, enums, localStorage roundtrip
  - `profileExport.test.ts` (9 tests): envelope validation, import/dedup
  - `printerConsole.test.tsx` (18 tests): render, E-STOP, jog, messages, keyboard shortcuts
  - `confirmModal.test.tsx` (9 tests): open/close, callbacks, accessibility
  - `debouncedRange.test.tsx` (6 tests): debounce, rapid changes, clamping

### Changed
- **Numeric input debounce** — ParameterField number inputs now debounce 200ms on blur/Enter (range sliders already had this)
- **Ring buffer for serial messages** — `RingBuffer<T>` class replaces `[...prev, msg].slice(-500)`, O(1) push with no per-message array copy
- **SVG wheel zoom throttle** — `handleWheel` throttled to 50ms via `performance.now()` to prevent trackpad stutter
- **Vercel analytics conditional** — `@vercel/analytics` and `@vercel/speed-insights` lazy-loaded only when `import.meta.env.VERCEL === '1'`; no errors in non-Vercel deployments
- **Delta arm length removed** — `deltaArmLength` removed from `MachineProfile` type, `DeltaParams`, material presets, and G-code generator defaults (only `deltaRodLength` used)

### Fixed
- **Double `getStoredMachines()` call** — extracted to `initialMachines` const outside zustand `create` to prevent initialization duplication
- **G-code input validation** — `validateGCode()` strips control chars, validates line starts with G/M/T/S/F/O/N, warns/blocks dangerous commands
- **Machine deletion confirmation** — wired `useConfirmModal` hook to MachineSelector delete button
- **Hardcoded pattern dimensions** — `generatePatternPaths` captures return values from each generator for `patternWidth`/`patternHeight`
- **M3 → M4 in M3_M4_M5 mode** — corrected laser on command from M3 to M4 for bidirectional mode
- **State-during-render fix** — removed render-time `setState` from SVGVisualizer; added `key` prop in App.tsx with machine dimensions to force remount
- **Jog inconsistency** — both SVG click and arrow buttons now use absolute `G0 X Y` with position tracking
- **Serial send timeout** — `waitForSlot()` rejects after 10s; `printGCode()` catches and aborts with error message; pending timeouts cleaned on disconnect
- **PrinterConsole theme** — replaced hardcoded `const isLight = false` with `useTheme()`
- **Baud rate bug** — `connect()` coerces baudRate with `Math.floor(Number(baudRate || 250000)) || 250000`; `isValidMachineProfile` validates positive finite number
- **Z-jog fix** — `jog()` function handles Z axis with `G91 G0 Z{dist} G90`
- **Movement mode stuck at G91** — changed `if/else if` to two independent `if` checks so compound commands like `G91 G0 Z5 G90` resolve correctly
- **Silent upload errors** — `window.alert` with error message in catch block
- **Edited G-code visualization** — `effectiveResults` re-parses via `parseGCode()` to keep SVG/time in sync
- **Dockerfile** — removed `pnpm-workspace.yaml` from COPY, added `HEALTHCHECK` and `nginx.conf` for SPA routing
- **Images moved** to `images/` directory, README updated

### Added
- **`baudRate` field on `MachineProfile`** — serial baud rate is now a per-machine setting (default 250000). Users can configure 115200, 57600, etc. from the Machine Selector editor without editing code
- **Connect button in Machine Selector** — power icon button between machine dropdown and + button. Connect/disconnect directly from the sidebar without scrolling to Operate tab
- **Homing warning before Run Job** — if machine has `homingEnabled` and user hasn't homed, a banner appears with "Home & Run", "Run Anyway", and "Cancel" options
- **Material power unit labels** — power sliders now show `PWM (0–1000)` for GRBL machines or `Power % (0–255)` for Marlin machines, clarifying the unit system in use
- **`usePatternParams` hook** — extracts 13 pattern config state variables, setters, and `loadPreset()` from App.tsx
- **`useMachineStore` hook** — extracts machine CRUD, selection, and localStorage persistence from App.tsx
- **`useMaterialStore` hook** — extracts material CRUD, selection, and localStorage persistence from App.tsx

### Changed
- **App.tsx refactored** from 695 → 602 lines. State management delegated to three custom hooks; App.tsx now owns only UI chrome, generation effects, keyboard shortcuts, and JSX layout
- **Version string** derived from `package.json` via Vite `define` (`__APP_VERSION__`) — single source of truth, no more hardcoded version in the header
- **MachineSelector editor** grid expanded from 3 to 4 columns to accommodate the new Baud Rate field
- **Run Job button relocated** from GCodeOutput to PrinterConsole (Operate tab). Operate tab is now the single entry point for running jobs, homing, and jog controls
- **GCodeOutput** simplified — removed print/serial props (`onPrint`, `isPrinterConnected`, `isPrinting`). Component now focuses solely on G-code viewing, copy, download, and stats

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
