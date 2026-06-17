# Implementation Plan: UI Redesign

## Overview

Refactor the LaserBench monolithic three-panel layout into a progressive-disclosure interface
with a tabbed left sidebar, a tabbed center panel, a main canvas with tabbed output, a floating
action button, and a persistent status bar. All existing component logic and state is preserved;
only the structural shell and two modified components (MachineSelector, MaterialDatabase) change.

Stack: React + TypeScript + Vite + Tailwind CSS. Property-based tests use `fast-check`.

---

## Tasks

- [x] 1. Install testing dependencies and set up test infrastructure
  - Install `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `fast-check` as dev dependencies
  - Create `vitest.config.ts` (or extend `vite.config.ts`) with jsdom environment and global setup
  - Add `src/test/setup.ts` that imports `@testing-library/jest-dom/vitest`
  - Add `test` script to `package.json`: `"test": "vitest --run"`
  - _Requirements: All (testing infrastructure for all requirement groups)_

- [x] 2. Add new UI tab state and sidebar mobile state to `App.tsx`
  - [x] 2.1 Add `sidebarTab`, `centerTab`, `outputTab`, and `sidebarOpen` state variables to `App.tsx`
    - Declare `const [sidebarTab, setSidebarTab] = useState<'machine' | 'material'>('machine')`
    - Declare `const [centerTab, setCenterTab] = useState<'pattern' | 'presets'>('pattern')`
    - Declare `const [outputTab, setOutputTab] = useState<'gcode' | 'console'>('gcode')`
    - Declare `const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)`
    - _Requirements: 1.4, 3.4, 4.6_

  - [x] 2.2 Augment `onLoadPreset` handler to call `setCenterTab('pattern')` after applying preset values
    - Locate the existing `onLoadPreset` callback in `App.tsx` and append `setCenterTab('pattern')` at the end of the handler body
    - _Requirements: 3.5 (Requirement 3.6)_

  - [x] 2.3 Augment `printGCode` invocation to call `setOutputTab('console')` when printing starts
    - Wrap the existing `printGCode(generatedResults.gcode)` call so that `setOutputTab('console')` is called in the same handler
    - _Requirements: 4.7_

  - [x]* 2.4 Write property test — preset load switches center tab to Pattern (Property 6)
    - **Property 6: Preset load switches center tab to Pattern**
    - **Validates: Requirement 3.6**
    - Use `fc.property` over arbitrary `GeneratorPreset` objects; assert `centerTab === 'pattern'` after `onLoadPreset` fires


- [x] 3. Implement keyboard shortcuts and Escape key modal handling in `App.tsx`
  - [x] 3.1 Add `useEffect` keyboard shortcut handler to `App.tsx`
    - Implement the `onKeyDown` handler that guards against focused `INPUT`/`TEXTAREA`/`SELECT`/`contenteditable` elements
    - Map keys `1`–`6` to the corresponding tab state setters; map `Escape` to close both `showHelpModal` and `showDictionary`
    - Register on `window` with an empty dependency array; clean up in the effect's return
    - _Requirements: 10.1, 10.2, 10.3, 10.8_

  - [x]* 3.2 Write property test — keyboard shortcut tab activation (Property 17)
    - **Property 17: Keyboard shortcut tab activation**
    - **Validates: Requirements 10.1, 10.2**
    - Use `fc.constantFrom('1','2','3','4','5','6')`; fire `keydown` on window; assert correct tab becomes active

  - [x]* 3.3 Write property test — Escape key closes modals (Property 18)
    - **Property 18: Escape key closes modals**
    - **Validates: Requirement 10.8**
    - Use `fc.boolean() × fc.boolean()` for `helpOpen` and `dictOpen`; fire `Escape`; assert both are false after


- [x] 4. Create layout shell components in `src/components/layout/`
  - [x] 4.1 Create `src/components/layout/Workspace.tsx`
    - Renders `<div className="flex flex-1 overflow-hidden overflow-x-hidden">` as the flex container for the three columns
    - Accepts `children: React.ReactNode`
    - _Requirements: 7.4_

  - [x] 4.2 Create `src/components/layout/LeftSidebar.tsx`
    - Implement the tab bar with `role="tablist"`, two `role="tab"` buttons ("Machine" / "Material") with `aria-selected`, `aria-controls`, and `id` attributes
    - Active tab gets `border-b-2 border-red-600 text-white`; inactive gets `text-[#888] hover:text-[#E0E0E0]`
    - On `lg` viewports: `<aside className="w-[360px] shrink-0 flex flex-col border-r border-white/8 overflow-y-auto">`
    - On `sm`/`md`: becomes a `fixed` slide-over with `translate-x-0` / `-translate-x-full` CSS transition, a backdrop overlay, and `onClose` on backdrop click
    - Auto-close slide-over via `useEffect` + `resize` listener when viewport ≥ 1024 px
    - All tab buttons must have minimum `min-h-[44px]` tap target
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.8, 7.5, 10.4, 10.6, 10.7_

  - [x]* 4.3 Write property test — Sidebar tab mutual exclusivity (Property 1)
    - **Property 1: Sidebar tab mutual exclusivity**
    - **Validates: Requirements 1.2, 1.3**
    - Use `fc.constantFrom('machine', 'material')`; render `LeftSidebar` with each tab value; assert exactly one child panel is visible

  - [x] 4.4 Create `src/components/layout/CenterPanel.tsx`
    - Implement the tab bar with `role="tablist"`, two `role="tab"` buttons ("Pattern" / "Presets") with full ARIA attributes
    - Same column width and tab visual pattern as `LeftSidebar`
    - All tab buttons must have minimum `min-h-[44px]` tap target
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 7.5, 10.4, 10.6, 10.7_

  - [x]* 4.5 Write property test — Center panel tab mutual exclusivity (Property 5)
    - **Property 5: Center panel tab mutual exclusivity**
    - **Validates: Requirements 3.2, 3.3**
    - Use `fc.constantFrom('pattern', 'presets')`; render `CenterPanel`; assert `PatternConfigurator` visible ↔ tab is `'pattern'` and `PresetManager` visible ↔ tab is `'presets'`


  - [x] 4.6 Create `src/components/layout/MainCanvas.tsx`
    - Render `<div className="flex-1 flex flex-col min-w-0 overflow-hidden">` as flex-1 column
    - SVGVisualizer child slot gets `flex-1 min-h-[300px] md:min-h-[400px]`
    - Output panel tab bar with `role="tablist"`, two `role="tab"` buttons ("G-Code" / "Console") with `aria-selected` and `aria-controls`; output panel content area has `max-h-[420px] overflow-y-auto`
    - Render green pulsing badge on "Console" tab label when `isConnected === true`; remove badge when `isConnected === false`
    - Auto-switch to "Console" tab when `isPrinting` transitions false → true (pass `outputTab`, `onOutputTabChange`, `isPrinting` as props; the parent `App.tsx` handles the actual state update via the augmented `printGCode` handler)
    - DOM-persist both `GCodeOutput` and `PrinterConsole` using `className={tab === 'gcode' ? 'block' : 'hidden'}` wrappers; never conditionally render them
    - All tab buttons must have minimum `min-h-[44px]` tap target
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 7.5, 10.4, 10.6, 10.7_

  - [x]* 4.7 Write property test — Output panel DOM persistence (Property 7)
    - **Property 7: Output panel DOM persistence**
    - **Validates: Requirements 4.4, 4.5**
    - Use `fc.constantFrom('gcode', 'console')`; render `MainCanvas`; assert both `GCodeOutput` and `PrinterConsole` nodes are in the document regardless of `outputTab` value

  - [x]* 4.8 Write property test — Console tab connection badge (Property 9)
    - **Property 9: Console tab connection badge**
    - **Validates: Requirement 4.8**
    - Use `fc.boolean()` for `isConnected`; render `MainCanvas`; assert badge element present ↔ `isConnected === true`

  - [x]* 4.9 Write property test — Job start switches output tab to Console (Property 8)
    - **Property 8: Job start switches output tab to Console**
    - **Validates: Requirement 4.7**
    - Simulate `printGCode` call in `App`; assert `outputTab` becomes `'console'` regardless of previous value


- [x] 5. Create `GenerateFAB` component
  - [x] 5.1 Create `src/components/layout/GenerateFAB.tsx`
    - Render `<button className="fixed bottom-10 right-6 z-50 rounded-full ...">` with `aria-label="Generate G-Code"` and `aria-disabled` attribute
    - When `disabled` (i.e. `generatedResults === null`): apply `opacity-50 cursor-not-allowed pointer-events-none` and set `aria-disabled="true"`
    - When enabled: red background with `shadow-[0_0_12px_rgba(220,38,38,0.4)]` glow and `aria-disabled="false"`
    - Render estimated time as `<span>` beneath button label text when `estimatedTimeStr` is not null; omit entirely when null
    - `onClick` handler calls `onClick` prop and guards with early return when `disabled` is true
    - Minimum `min-w-[44px] min-h-[44px]` tap target
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.5_

  - [x]* 5.2 Write property test — FAB enabled state mirrors generatedResults (Property 10)
    - **Property 10: FAB enabled state mirrors generatedResults**
    - **Validates: Requirement 5.3**
    - Use `fc.option(fc.record({ gcode: fc.string(), paths: fc.array(fc.anything()) }))`; render `GenerateFAB`; assert `aria-disabled` equals `(results === null).toString()`

  - [x]* 5.3 Write property test — FAB shows estimated time when available (Property 11)
    - **Property 11: FAB shows estimated time when available**
    - **Validates: Requirement 5.5**
    - Use `fc.option(fc.string({ minLength: 1 }))` for `estimatedTimeStr`; assert time label present in DOM ↔ `estimatedTimeStr !== null`


- [ ] 6. Create `StatusBar` component (replaces current footer)
  - [ ] 6.1 Create `src/components/layout/StatusBar.tsx`
    - Render `<footer className="h-8 bg-[#0E0E0E] border-t border-white/8 flex items-center px-4 gap-4 text-[10px] font-mono shrink-0 fixed bottom-0 inset-x-0 z-40">` (height must not exceed 40px)
    - Accept `StatusBarProps`: `isConnected`, `connectionState: 'connected' | 'offline' | 'connecting'`, `machineName`, `firmware`, `materialName`, `estimatedTimeStr`, `isDelta`, `deltaPrintRadius`, `isPrinting`, `progress`
    - Render connection indicator: green pulsing dot + "CONNECTED" when `connected`; grey static dot + "OFFLINE" when `offline`; yellow pulsing dot + "CONNECTING" when `connecting`; use `data-testid="connection-label"` on the label element
    - Render all six indicators at all times: connection status, machine name, firmware, material name, estimated burn time (or `—` dash placeholder), delta indicator (when `isDelta === true`)
    - When `isPrinting && progress > 0 && progress < 100`: display progress percentage; when `isPrinting && (progress === 0 || progress === 100)`: display "PRINTING…" without percentage; when not printing: no progress indicator
    - Truncate long text with `truncate` utility to prevent horizontal overflow
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ]* 6.2 Write property test — Status bar completeness (Property 14)
    - **Property 14: Status bar completeness**
    - **Validates: Requirement 9.1**
    - Use arbitrary combinations of connection state, machine name, material name, `estimatedTimeStr`, `isDelta`; assert all six indicator groups are present in the rendered output

  - [ ]* 6.3 Write property test — Status bar connection display (Property 15)
    - **Property 15: Status bar connection display**
    - **Validates: Requirements 9.3, 9.4, 9.5**
    - Use `fc.constantFrom('connected', 'offline', 'connecting')`; assert label text and dot class match exactly

  - [ ]* 6.4 Write property test — Status bar print progress display (Property 16)
    - **Property 16: Status bar print progress display**
    - **Validates: Requirements 9.7, 9.8, 9.9**
    - Use `fc.boolean()` for `isPrinting` and `fc.integer({ min: 0, max: 100 })` for `progress`; assert progress percentage rendered ↔ `isPrinting && progress > 0 && progress < 100`

- [ ] 7. Checkpoint — Ensure all layout shell tests pass
  - Run `pnpm test` and confirm all tests for Tasks 2–6 pass; resolve any type or import errors before continuing


- [ ] 8. Modify `MachineSelector` — collapsible sections (Requirement 2)
  - [ ] 8.1 Add `collapsedSections` state and `toggleSection` helper to `MachineSelector.tsx`
    - Define `type SectionKey = 'laserCommands' | 'motionZ' | 'bedGeometry' | 'deltaKinematics'`
    - Initialize state: `laserCommands: true`, `motionZ: true`, `bedGeometry: false`, `deltaKinematics: true`
    - Implement `toggleSection(key)` that enforces the "at least one expanded" invariant: if toggling would collapse all sections, return `prev` unchanged
    - When `isDelta` transitions false → true: call `setCollapsedSections(prev => ({ ...prev, deltaKinematics: false }))` inside a `useEffect` or the `onChange` handler
    - When `isDelta` transitions true → false: call `setCollapsedSections(prev => ({ ...prev, deltaKinematics: true }))`
    - When edit form opens (`isEditing` becomes true): reset `collapsedSections` to default initial values
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.10_

  - [ ] 8.2 Reorganize the `MachineSelector` edit form into four collapsible section blocks
    - Restructure each section with a `<button aria-expanded={!collapsed} aria-controls={...}>` header containing label text and a `ChevronDown` icon that rotates 180° via `transition-transform` when expanded
    - Section content wrapped in `<div id={...} className={collapsed ? 'hidden' : 'space-y-3 pb-3'}>` 
    - Sections: "Laser Commands" (laserOn, laserOff), "Motion & Z" (safeZ, workZ, travelSpeed, acceleration), "Bed Geometry" (bedShape, bedWidth/Height, originX/Y), "Delta Kinematics" (isDelta checkbox + delta fields)
    - Section dividers use `border-t border-white/5` (not background color blocks)
    - Use `py-3 px-0` on section header buttons to ensure ≥ 44px height on mobile
    - _Requirements: 2.1, 2.2, 6.4_

  - [ ] 8.3 Implement always-visible header area in `MachineSelector`
    - Move machine name, firmware badge, PWM max value, machine profile dropdown, and New profile button outside any collapsible section
    - Delete profile button visible in this header area only when `machines.length > 1`
    - Apply left-side accent border (`border-l-2 border-l-red-600`) to the panel card when `isEditing === true`; retain standard `border-white/8` on other three sides
    - _Requirements: 2.9, 6.7_

  - [ ]* 8.4 Write property test — Section collapse invariant (Property 3)
    - **Property 3: MachineSelector section collapse invariant**
    - **Validates: Requirement 2.10**
    - Use `fc.array(fc.constantFrom('laserCommands','motionZ','bedGeometry','deltaKinematics'), { minLength: 1, maxLength: 20 })`; apply toggle sequence; assert `Object.values(result).some(v => !v)` always true

  - [ ]* 8.5 Write unit tests for `MachineSelector` always-visible header (Property 4)
    - For any `MachineProfile`, verify machine `name` and `firmware` are rendered in the header regardless of which sections are collapsed
    - Test that isDelta toggle expanding deltaKinematics section works correctly
    - _Requirements: 2.9_


- [ ] 9. Modify `MaterialDatabase` — compact summary row and collapsible calibration log (Requirement 8)
  - [ ] 9.1 Implement compact summary row in `MaterialDatabase.tsx`
    - Replace the existing two-card engrave/cut display in non-edit mode with a single compact row showing all eight fields: material name, thickness, focusZ, laser rating, engrave.power, engrave.speed, cut.power, cut.speed
    - Layout: name + thickness + focusZ + laser rating on line 1; `Engrave: S[power] F[speed]  Cut: S[power] F[speed]` on line 2
    - None of the eight fields may be omitted regardless of value magnitude
    - Apply left-side accent border when `isEditing === true`
    - _Requirements: 8.1, 8.3, 6.7_

  - [ ] 9.2 Wrap Calibration Log section in a collapsible container with default collapsed state
    - Add `const [logExpanded, setLogExpanded] = useState(false)` to `MaterialDatabase`
    - Render a toggle button labeled "Calibration Log" with a chevron icon (`aria-expanded`, `aria-controls`)
    - Wrap the entire existing log list and log form in `<div className={logExpanded ? 'block' : 'hidden'}>` 
    - _Requirements: 8.2_

  - [ ] 9.3 Update category tabs to show icon + label on `md+` and icon-only on `sm`
    - Add icon imports (use existing lucide-react icons that semantically fit each category)
    - Wrap label text in `<span className="hidden md:inline ml-1">{cat}</span>`
    - Each `<button>` retains `aria-label` with the full category name regardless of breakpoint
    - _Requirements: 8.4, 10.6_

  - [ ] 9.4 Ensure side-by-side material list and summary row on `md+` viewports
    - Verify the existing `grid grid-cols-1 md:grid-cols-3` layout works correctly within the new sidebar
    - Summary row and material list must stack on `< 768px` and appear side-by-side on `≥ 768px`
    - _Requirements: 8.5_

  - [ ]* 9.5 Write property test — MaterialDatabase summary row completeness (Property 12)
    - **Property 12: MaterialDatabase summary row completeness**
    - **Validates: Requirement 8.1**
    - Use `fc.record({ name: fc.string(), thickness: fc.float(), focusZ: fc.float(), laser: fc.string(), engrave: fc.record({ power: fc.integer(), speed: fc.integer() }), cut: fc.record({ power: fc.integer(), speed: fc.integer() }) })`; render in non-edit mode; assert all eight values present in DOM

  - [ ]* 9.6 Write property test — Material selection updates summary immediately (Property 13)
    - **Property 13: Material selection updates summary immediately**
    - **Validates: Requirement 8.3**
    - Render `MaterialDatabase` with multiple materials; select different material IDs; assert summary row reflects the newly selected material's data in the same render


- [ ] 10. Checkpoint — Ensure component modification tests pass
  - Run `pnpm test` and confirm all tests for Tasks 8–9 pass; fix any regression in existing component behavior

- [ ] 11. Wire layout into `App.tsx` — replace monolithic grid with new shell
  - [ ] 11.1 Restructure `App.tsx` return statement to use new layout components
    - Remove the `<main>` 12-col grid and replace with `<AppShell>` pattern: `Header` → `DeltaWarningBanner` → `Workspace` containing `LeftSidebar` + `CenterPanel` + `MainCanvas`
    - Pass all existing state and handler props down through the new layout components exactly as they are today — no state is moved out of `App.tsx`
    - `LeftSidebar` receives: `activeTab={sidebarTab}`, `onTabChange={setSidebarTab}`, `isOpen={sidebarOpen}`, `onClose={() => setSidebarOpen(false)}`
    - `CenterPanel` receives: `activeTab={centerTab}`, `onTabChange={setCenterTab}`
    - `MainCanvas` receives: `outputTab`, `onOutputTabChange={setOutputTab}`, `isConnected`, `isPrinting`
    - `GCodeOutput` and `PrinterConsole` are rendered unconditionally inside `MainCanvas` with `block`/`hidden` wrapper divs
    - Add `pb-8` to the `Workspace` container so content is not obscured by the fixed `StatusBar`
    - _Requirements: 1.1–1.3, 3.1–3.3, 4.1–4.5_

  - [ ] 11.2 Remove the existing header "GENERATE G-CODE" button and replace with `GenerateFAB`
    - Delete the `<button>` with `onClick={handleDownloadGCode}` text "GENERATE G-CODE" from the header
    - Render `<GenerateFAB disabled={!generatedResults} estimatedTimeStr={estimatedTimeStr} onClick={handleDownloadGCode} />` outside `Workspace`, positioned after it in the DOM
    - _Requirements: 5.6, 5.1, 5.4_

  - [ ] 11.3 Remove existing footer and render `StatusBar` as the fixed bottom element
    - Delete the existing `<footer>` element (the BUFFER/Z-FOCUS/LASER debug bar)
    - Render `<StatusBar connectionState={isConnected ? 'connected' : 'offline'} machineName={activeMachine?.name} firmware={activeMachine?.firmware} materialName={activeMaterial?.name} estimatedTimeStr={estimatedTimeStr} isDelta={activeMachine?.isDelta ?? false} deltaPrintRadius={activeMachine?.deltaPrintRadius} isPrinting={isPrinting} progress={progress} isConnected={isConnected} />`
    - Expose `connectionState` from `useWebSerial` hook or derive it in `App.tsx`; extend hook if needed to surface `'connecting'` state
    - _Requirements: 9.1, 9.6_

  - [ ] 11.4 Add hamburger toggle button to the header for mobile sidebar
    - Render `<button aria-label="Open sidebar navigation">` with a hamburger icon in the header, visible only on `< lg` viewports (`lg:hidden`)
    - On click: `setSidebarOpen(true)`
    - _Requirements: 1.7_

  - [ ]* 11.5 Write unit tests for App integration: machine state preserved across tab switches (Property 2)
    - **Property 2: Machine state preserved across tab switches**
    - **Validates: Requirement 1.5**
    - Simulate machine profile field changes and selection changes while `sidebarTab` is on either tab; assert `sidebarTab` value is unchanged after the machine update

