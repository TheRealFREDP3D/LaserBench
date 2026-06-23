# LaserBench Improvement Plan

Generated: Mon Jun 22 2026

## Stats

~8,900 lines of source across 49 files. 14 test files (~100 tests). 43% source-level test coverage. React 19 + Vite 6 + TypeScript 5.8 + Tailwind v4.

---

## Phase 1 — Fix Bugs

### #1 `useWebSerial.ts` — Unhandled Promise Rejections
- `encoder.readable.pipeTo(port.writable)` at line 108 is never awaited
- `readableStreamClosed` promise from read loop pipe is never caught
- Both create unhandled rejections on port disconnect

### #2 `timeEstimator.ts` — Math Bug (Line 51)
- Trapezoid acceleration formula missing deceleration phase
- Current: `(v/a) + (d/v)`
- Correct: `2*(v/a) + (d - v²/a)/v`
- Underestimates time for short segments

### #3 `gcodeGenerator.ts` — Title Positioning Bug
- Titles for `power_ramp`, `speed_ramp`, `kerf_test` drawn at incorrect Y coordinates
- Overlap with or appear below pattern content instead of in title area

### #4 `materialPresets.ts` — No Schema Validation on localStorage
- `JSON.parse()` returns `any` with no runtime type checking
- Corrupted or schema-mismatched localStorage data silently passes through

### #5 `materialPresets.ts` — Zero Cut Speed for Slate
- `cut.speed: 0` produces `F0` in G-code, invalid for most firmware
- Can cause hangs or division-by-zero

### #9 `DebouncedRange.tsx` — Timer Leak on Unmount
- Debounce timer never cleared on unmount
- Can fire `onChange` after component unmount

---

## Phase 2 — Performance

### #6 `App.tsx` — Missing `useCallback` on Inline Arrow Props
- Every inline arrow defeats `React.memo` on child components
- Affects: MachineSelector, MaterialDatabase, PatternConfigurator, PresetManager, SVGVisualizer, GCodeOutput, PrinterConsole

### #7 `SVGVisualizer.tsx` — `handleMouseMove` O(n) on Every Pixel
- Nearest-path computation runs on every mouse move with no throttling
- Redundant min/max computation (3 passes over same data)

### #8 `GCodeOutput.tsx` — No Virtualization
- Renders a `<div>` per G-code line
- Large patterns generate thousands of lines causing DOM bloat

---

## Phase 3 — Architecture

### #10 No Component-Level Error Boundaries
- Only root `ErrorBoundary` exists
- Crash in SVGVisualizer or PrinterConsole takes down entire app

### #11 Theme Prop Threading (~20 Components)
- `theme` drilled through every component
- A `ThemeContext` would eliminate this prop entirely

### #12 `gcodeGenerator.ts` — 235-Line Pattern Type Chain
- Monolithic `if/else if` for 5 pattern types
- Should split into separate generator functions per type

### #13 `materialPresets.ts` — Duplicated Persistence Pattern
- 4 nearly identical `get`/`save` functions
- Should generalize into `getStored<T>` / `saveStored<T>`

---

## Phase 4 — Tests

### #16 `useWebSerial.ts` — 0% Coverage
- Entire serial communication hook untested (buffer management, abort flow, slot system)
- Single biggest coverage gap

### #17 All 5 Custom Hooks — 0% Coverage
- useMachineStore, useMaterialStore, usePatternParams, useFocusTrap, useConfirmModal

### #18 Large UI Components — 0% Coverage
- SVGVisualizer (836 lines), PresetManager (548 lines), PatternConfigurator (507 lines), PrinterConsole (307 lines)

### #19 Harness Tests Diverge from Real Components
- presetFlyout.test.tsx and keyboardShortcuts.test.tsx test re-implementations, not actual components

---

## Phase 5 — Polish

### #14 `usePatternParams` — No Persistence
- Pattern configuration resets on every page load

### #15 `useMachineStore` / `useMaterialStore` — Duplicated Structure
- Identical CRUD hooks, could be single `useEntityStore<T>`

### #20 `deltaArmLength` — Dead Parameter
- Defined in DeltaParams but never used in kinematics

### #21 `applyToggles` — Exported but Unused
- MachineSelector.tsx exports function never used outside

### #22 `GCODE_DATABASE` — Static Data in Component
- 211 lines of static data lives in GCodeDictionary.tsx component file

### #23 Magic Numbers in `gcodeGenerator.ts`
- Positioning multipliers (0.4, 0.6, 0.3) unnamed and undocumented

### #24 No Fallback for Unrecognized `patternType`
- Silent empty pattern if new type added without branch

### #25 SVG Stroke Color Thresholds Absolute
- Maps absolute power against max, not relative to pattern range

### #26 `inverseKinematics` — Dead Code
- Never called from anywhere in the codebase

### #27 Missing `<label>` Associations
- Several form inputs lack proper label associations

### #28 Preset List Items — Accessibility
- `<div onClick>` without `role="button"` or keyboard support

### #29 FIRE Button — No Keyboard Equivalent
- Mouse-only press-and-hold in PrinterConsole

### #30 `ConfirmModal` — Not Memoized
- Created fresh every render in useConfirmModal
