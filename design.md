# Design Document: UI Redesign

## Overview

LaserBench v1.3 displays all eight components simultaneously in a fixed three-panel grid, producing a
dense, overwhelming layout where every section competes for attention at once. This redesign
reorganises the same feature set into a contextual, progressive-disclosure interface without
removing any existing functionality.

The new layout has four persistent regions:

- **Left Sidebar** (320–420 px) — tabbed Machine / Material configuration
- **Center Panel** (~320–420 px) — tabbed Pattern / Presets configuration
- **Main Canvas** (remaining width) — prominent SVGVisualizer + tabbed G-Code / Console below
- **Status Bar** (32 px) — always-visible machine and job status, replaces the current footer

A **Floating Action Button** (FAB) floats above the status bar in the lower-right corner for the
primary Generate action.

No new libraries are required. All existing component logic, G-code generation, WebSerial
communication, and localStorage persistence behaviour is preserved.

---

## Architecture

### Current Architecture

```
App.tsx  (all state, all handlers)
└─ header  (fixed h-16)
└─ main  (12-col grid)
   ├─ col-span-4  MachineSelector  ─┐  both always visible,
   │              MaterialDatabase  ─┘  stacked, long scroll
   ├─ col-span-4  PatternConfigurator  ─┐  both always visible,
   │              PresetManager        ─┘  stacked, long scroll
   └─ col-span-4  SVGVisualizer
                  GCodeOutput
                  PrinterConsole
└─ footer  (h-10, debug metadata)
```

### New Architecture

```
App.tsx  (all state, all handlers — unchanged)
└─ AppShell
   ├─ Header         (h-14, unchanged branding + theme toggle + dict button)
   ├─ DeltaWarningBanner  (conditional, same as today)
   ├─ Workspace      (flex-row, fills remaining height)
   │   ├─ LeftSidebar    (320–420 px, flex-col)
   │   │   ├─ SidebarTabBar  ["Machine" | "Material"]
   │   │   └─ SidebarTabContent
   │   │       ├─ MachineSelector   (visible when tab = "machine")
   │   │       └─ MaterialDatabase  (visible when tab = "material")
   │   ├─ CenterPanel   (320–420 px, flex-col)
   │   │   ├─ CenterTabBar  ["Pattern" | "Presets"]
   │   │   └─ CenterTabContent
   │   │       ├─ PatternConfigurator  (visible when tab = "pattern")
   │   │       └─ PresetManager        (visible when tab = "presets")
   │   └─ MainCanvas    (flex-1, flex-col)
   │       ├─ SVGVisualizer   (flex-1, min-h-[400px])
   │       └─ OutputPanel     (tabbed, fixed height or max-h)
   │           ├─ OutputTabBar  ["G-Code" | "Console"]
   │           └─ OutputTabContent
   │               ├─ GCodeOutput     (DOM-always-present, hidden when tab ≠ "gcode")
   │               └─ PrinterConsole  (DOM-always-present, hidden when tab ≠ "console")
   ├─ StatusBar      (h-8 fixed bottom)
   └─ GenerateFAB    (fixed bottom-right, above status bar)
```

### App.tsx Restructuring

`App.tsx` keeps all existing state and handler logic intact. The only structural change is that
the `return` statement is refactored: instead of a monolithic `<main>` grid, it renders the new
layout components and passes state / callbacks down as props exactly as today.

New state added to `App.tsx`:

```ts
// Tab state
const [sidebarTab, setSidebarTab] = useState<'machine' | 'material'>('machine');
const [centerTab, setCenterTab]   = useState<'pattern' | 'presets'>('pattern');
const [outputTab, setOutputTab]   = useState<'gcode' | 'console'>('gcode');

// Sidebar collapse (mobile)
const [sidebarOpen, setSidebarOpen] = useState(false);
```

Two existing side-effects need augmentation:

1. When `onLoadPreset` fires → also call `setCenterTab('pattern')` (Req 3.5)
2. When `printGCode` is invoked → also call `setOutputTab('console')` (Req 4.7)

All keyboard shortcuts are wired via a single `useEffect` in `App.tsx` (see §Keyboard Shortcuts).

---

## Layout Structure and Component Hierarchy

### Responsive Breakpoints

| Breakpoint | Viewport | Layout |
|---|---|---|
| `sm` | < 768 px | Single-column vertical stack; sidebar collapses to slide-over drawer |
| `md` | 768–1023 px | Two-column: (sidebar + center stacked) left · (canvas + output) right |
| `lg` | ≥ 1024 px | Three-column: sidebar · center · canvas |

```
lg (≥1024px)
┌────────────────────────────────────────────────────────────────────┐
│ Header                                                    h-14      │
│ [DeltaWarningBanner — optional]                                     │
├─────────────┬──────────────┬───────────────────────────────────────┤
│ LeftSidebar │ CenterPanel  │            MainCanvas                 │
│  ~360px     │  ~360px      │            flex-1                     │
│             │              │  ┌──────────────────────────────────┐ │
│ [Machine]   │ [Pattern]    │  │  SVGVisualizer   (flex-1 ≥400px)│ │
│ [Material]  │ [Presets]    │  │                                  │ │
│             │              │  └──────────────────────────────────┘ │
│             │              │  ┌──────────────────────────────────┐ │
│             │              │  │  OutputPanel (max-h-[420px])     │ │
│             │              │  │  [G-Code] [Console●]             │ │
│             │              │  └──────────────────────────────────┘ │
├─────────────┴──────────────┴───────────────────────────────────────┤
│ StatusBar                                                  h-8      │
│                                               [Generate FAB]  ↑    │
└────────────────────────────────────────────────────────────────────┘

md (768–1023px)
┌────────────────────────────────────────┐
│ Header                                 │
├─────────────────┬──────────────────────┤
│ LeftSidebar     │  MainCanvas          │
│ (tabs)          │  SVGVisualizer       │
├─────────────────┤  OutputPanel         │
│ CenterPanel     │                      │
│ (tabs)          │                      │
├─────────────────┴──────────────────────┤
│ StatusBar                              │
└────────────────────────────────────────┘

sm (<768px)
┌─────────────────────────┐
│ Header [☰ sidebar btn]  │
├─────────────────────────┤
│ CenterPanel (tabs)      │
├─────────────────────────┤
│ SVGVisualizer (≥300px)  │
├─────────────────────────┤
│ OutputPanel (tabs)      │
├─────────────────────────┤
│ StatusBar               │
│             [FAB] ↗     │
└─────────────────────────┘
(LeftSidebar is a slide-over overlay, triggered by hamburger)
```

---

## Components and Interfaces

### New Layout Components

All new layout components live in `src/components/layout/`. They are pure presentational
wrappers — they hold no business state and import no lib utilities.

#### `Workspace`

```tsx
// src/components/layout/Workspace.tsx
interface WorkspaceProps {
  children: React.ReactNode; // expects LeftSidebar, CenterPanel, MainCanvas
}
```

Renders `<div className="flex flex-1 overflow-hidden">`. This is the flex container for the
three columns. It fills the space between the Header and the StatusBar.

#### `LeftSidebar`

```tsx
interface LeftSidebarProps {
  activeTab: 'machine' | 'material';
  onTabChange: (tab: 'machine' | 'material') => void;
  isOpen: boolean;           // mobile slide-over state
  onClose: () => void;
  children: React.ReactNode; // tab content
}
```

On `lg`: `<aside className="w-[360px] flex-col border-r border-white/8 overflow-y-auto">`.
On `sm/md`: `<aside>` becomes a fixed slide-over overlay with a backdrop. Uses
`translate-x-0` / `-translate-x-full` CSS transitions.

Tab bar renders two `<button>` items with `aria-selected` and `role="tab"`. Active tab gets
the red accent underline (`border-b-2 border-red-600`).

Keyboard shortcut `1` → machine tab; `2` → material tab.

#### `CenterPanel`

```tsx
interface CenterPanelProps {
  activeTab: 'pattern' | 'presets';
  onTabChange: (tab: 'pattern' | 'presets') => void;
  children: React.ReactNode;
}
```

Same column width as `LeftSidebar`. Same tab bar pattern. Keyboard shortcut `3` → pattern;
`4` → presets.

#### `MainCanvas`

```tsx
interface MainCanvasProps {
  outputTab: 'gcode' | 'console';
  onOutputTabChange: (tab: 'gcode' | 'console') => void;
  isConnected: boolean;
  children: React.ReactNode; // SVGVisualizer + output panel content
}
```

`flex-1 flex-col min-w-0 overflow-hidden`. The SVGVisualizer child gets `flex-1 min-h-[400px]`.
The output panel sits below with `max-h-[420px]` and its own scroll.

Connection badge on "Console" tab: `<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />`.

Keyboard shortcut `5` → gcode; `6` → console.

#### `StatusBar`

```tsx
interface StatusBarProps {
  isConnected: boolean;
  connectionState: 'connected' | 'offline' | 'connecting'; // drives indicator appearance
  machineName: string;
  firmware: string;
  materialName: string;
  estimatedTimeStr: string | null;
  isDelta: boolean;
  isPrinting: boolean;
  progress: number;
}
```

`<footer className="h-8 bg-[#0E0E0E] border-t border-white/8 flex items-center px-4 gap-4
text-[10px] font-mono shrink-0 fixed bottom-0 inset-x-0 z-40">`.

Fixed at the bottom of the viewport (`fixed bottom-0`). The `<main>` workspace gets
`pb-8` to avoid content being hidden behind it.

Connection indicator states:
- `connected`: green pulsing dot (`animate-pulse bg-emerald-500`) + label "CONNECTED"
- `offline`: grey static dot (`bg-zinc-500`) + label "OFFLINE"
- `connecting`: yellow pulsing dot (`animate-pulse bg-amber-400`) + label "CONNECTING"

When `isPrinting === true && progress > 0`, renders progress percentage alongside remaining time.

#### `GenerateFAB`

```tsx
interface GenerateFABProps {
  disabled: boolean;
  estimatedTimeStr: string | null;
  onClick: () => void;
}
```

`<button className="fixed bottom-10 right-6 z-50 ...">` — `bottom-10` keeps it above the
32 px status bar with 8 px gap.

When `disabled`: `opacity-50 cursor-not-allowed`. When enabled: red background with subtle
box-shadow glow (`shadow-[0_0_12px_rgba(220,38,38,0.4)]`).

Estimated time renders as a small `<span>` beneath the "Generate" label text.

### Modifications to Existing Components

#### `MachineSelector` — Collapsible Sections (Req 2)

Add a `collapsedSections` state:

```ts
type SectionKey = 'laserCommands' | 'motionZ' | 'bedGeometry' | 'deltaKinematics';

const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
  laserCommands:    true,   // default collapsed
  motionZ:          true,   // default collapsed
  bedGeometry:      false,  // default expanded
  deltaKinematics:  true,   // default collapsed
});
```

A `toggleSection(key: SectionKey)` helper enforces the "at least one expanded" invariant:

```ts
const toggleSection = (key: SectionKey) => {
  setCollapsedSections(prev => {
    const next = { ...prev, [key]: !prev[key] };
    const anyExpanded = Object.values(next).some(v => !v);
    if (!anyExpanded) return prev; // prevent full collapse
    return next;
  });
};
```

When `isDelta` is toggled on, call `setCollapsedSections(prev => ({ ...prev, deltaKinematics: false }))`.

The always-visible header area renders outside any section: machine name, firmware badge,
PWM max value, machine select dropdown, New/Delete buttons.

Section headers use a `<button>` with `aria-expanded={!collapsed}` and a `ChevronDown` icon
that rotates 180° when expanded (`transition-transform`).

#### `MaterialDatabase` — Compact Summary + Collapsed Log (Req 8)

**Summary row** (non-edit mode): replace the current two `<div>` cards (engrave / cut) with a
single compact row component that fits inside the sidebar panel without requiring scroll:

```
[Material Name]    [thickness]mm  |  Z: [focusZ]mm  |  [laser rating]
Engrave: S[power] F[speed]    Cut: S[power] F[speed]
```

All **eight** values (name, thickness, focusZ, laser rating, engrave.power, engrave.speed,
cut.power, cut.speed) render in this summary. Edit mode remains unchanged.

**Calibration Log**: wrap the existing log list in a collapsible section defaulting to closed,
mirroring the MachineSelector section pattern:

```ts
const [logExpanded, setLogExpanded] = useState(false);
```

**Category tabs**: use `icon + label` on `md+` and `icon-only` on `sm`. Tailwind:
`<span className="hidden md:inline ml-1">{cat}</span>`. Each category tab retains an
`aria-label` with the full category name regardless of icon-only vs icon+text rendering.

**Side-by-side layout**: the existing `grid grid-cols-1 md:grid-cols-3` remains appropriate.
No change needed — the sidebar scroll contains it.

#### `GCodeOutput` and `PrinterConsole` — DOM Persistence (Req 4.4 / 4.5)

Both components are rendered unconditionally in `MainCanvas`. Visibility is toggled via CSS
rather than conditional rendering:

```tsx
<div className={outputTab === 'gcode' ? 'block' : 'hidden'}>
  <GCodeOutput ... />
</div>
<div className={outputTab === 'console' ? 'block' : 'hidden'}>
  <PrinterConsole ... />
</div>
```

This ensures WebSerial message state in `PrinterConsole` is never destroyed when switching
tabs, and the G-code editor scroll position is preserved.

#### Header Simplification

The existing `GENERATE G-CODE` button in the header is **removed** — the FAB replaces it.
The `estimatedTimeStr` display moves from the old footer to both the FAB and the StatusBar.
The G-Code Dictionary button and theme toggle remain in the header unchanged.

---

## Data Models

No new data models are introduced. The redesign is purely structural. The existing types in
`src/types.ts` are unchanged.

### New UI State (added to `App.tsx`)

```ts
// ── Tab navigation state ──────────────────────────────────────────
type SidebarTab  = 'machine' | 'material';
type CenterTab   = 'pattern' | 'presets';
type OutputTab   = 'gcode'   | 'console';

const [sidebarTab,  setSidebarTab]  = useState<SidebarTab>('machine');
const [centerTab,   setCenterTab]   = useState<CenterTab>('pattern');
const [outputTab,   setOutputTab]   = useState<OutputTab>('gcode');

// ── Sidebar mobile state ──────────────────────────────────────────
const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
```

No persistence is required for tab state — it always resets to defaults on page load, which
matches the acceptance criteria (Req 1.4, 3.4, 4.6).

### Tab State Transitions

| Event | State change |
|---|---|
| User clicks sidebar "Material" tab | `setSidebarTab('material')` |
| User presses key `1` | `setSidebarTab('machine')` |
| User presses key `2` | `setSidebarTab('material')` |
| `onLoadPreset` fires | `setCenterTab('pattern')` |
| User presses key `3` | `setCenterTab('pattern')` |
| User presses key `4` | `setCenterTab('presets')` |
| `printGCode` is invoked | `setOutputTab('console')` |
| User presses key `5` | `setOutputTab('gcode')` |
| User presses key `6` | `setOutputTab('console')` |
| Escape key pressed | closes `showHelpModal` or `showDictionary` |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of
a system — essentially, a formal statement about what the system should do. Properties serve as
the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Sidebar tab mutual exclusivity

*For any* active sidebar tab value, `MachineSelector` is visible if and only if the tab is
`'machine'`, and `MaterialDatabase` is visible if and only if the tab is `'material'`. The two
panels are never simultaneously visible and never simultaneously hidden.

**Validates: Requirements 1.2, 1.3**

---

### Property 2: Machine state preserved across tab switches

*For any* machine profile update (field change, selection change) performed while the sidebar is
on either tab, the `sidebarTab` state remains equal to its value before the update. Machine
updates do not trigger a tab reset.

**Validates: Requirement 1.5**

---

### Property 3: MachineSelector section collapse invariant

*For any* sequence of `toggleSection` calls on the `MachineSelector`, the number of expanded
sections is always ≥ 1. It is impossible to reach a state where all four sections are collapsed.

**Validates: Requirement 2.9**

---

### Property 4: MachineSelector header always shows machine identity

*For any* `MachineProfile` passed to `MachineSelector`, the component's always-visible header
area contains both the machine `name` string and the `firmware` type string, regardless of which
sections are collapsed.

**Validates: Requirement 2.8**

---

### Property 5: Center panel tab mutual exclusivity

*For any* active center tab value, `PatternConfigurator` is visible if and only if the tab is
`'pattern'`, and `PresetManager` is visible if and only if the tab is `'presets'`. The two panels
are never simultaneously visible.

**Validates: Requirements 3.2, 3.3**

---

### Property 6: Preset load switches center tab to Pattern

*For any* preset (factory or custom) passed to `onLoadPreset`, the `centerTab` state becomes
`'pattern'` after the handler completes, regardless of the tab's previous value.

**Validates: Requirement 3.5**

---

### Property 7: Output panel DOM persistence

*For any* `outputTab` value, both `GCodeOutput` and `PrinterConsole` are present in the DOM
at all times. Only their CSS visibility differs (`display: block` vs `display: none`).

**Validates: Requirements 4.4, 4.5**

---

### Property 8: Job start switches output tab to Console

*For any* invocation of `printGCode`, the `outputTab` state becomes `'console'` after the call,
regardless of the tab's previous value.

**Validates: Requirement 4.7**

---

### Property 9: Console tab connection badge

*For any* `isConnected` boolean value, the Console tab label renders the green pulsing badge
element if and only if `isConnected === true`.

**Validates: Requirement 4.8**

---

### Property 10: FAB enabled state mirrors generatedResults

*For any* `generatedResults` value, the Generate FAB's disabled attribute equals
`(generatedResults === null)`. There is no intermediate state.

**Validates: Requirement 5.3**

---

### Property 11: FAB shows estimated time when available

*For any* non-null `estimatedTimeStr` string, the FAB renders that string as visible text. When
`estimatedTimeStr` is null, no time label is rendered.

**Validates: Requirement 5.5**

---

### Property 12: MaterialDatabase summary row completeness

*For any* `MaterialProfile` in non-edit mode, the summary row renders all **eight** values:
name, thickness, focusZ, laser rating, engrave.power, engrave.speed, cut.power, and cut.speed.
None are omitted regardless of value magnitude or string length.

**Validates: Requirement 8.1**

---

### Property 13: Material selection updates summary immediately

*For any* material ID selected from the category list, the summary row reflects the selected
material's data in the same render cycle. There is no stale display of the previous material.

**Validates: Requirement 8.3**

---

### Property 14: Status bar completeness

*For any* combination of app state (connected/disconnected/connecting, any machine, any
material, any `estimatedTimeStr`, `isDelta` true/false), the status bar renders all six
indicators: connection status, machine name, firmware type, material name, estimated burn time
(or placeholder dash), and delta indicator (when `isDelta` is true).

**Validates: Requirement 9.1**

---

### Property 15: Status bar connection display

*For any* connection state value, the status bar connection indicator is:
- the green pulsing dot labelled "CONNECTED" when `connectionState === 'connected'`
- the grey static dot labelled "OFFLINE" when `connectionState === 'offline'`
- the yellow pulsing dot labelled "CONNECTING" when `connectionState === 'connecting'`

No other states exist; every possible connection state maps to exactly one indicator style.

**Validates: Requirements 9.3, 9.4, 9.5**

---

### Property 16: Status bar print progress display

*For any* `isPrinting === true` and `progress > 0` combination, the status bar renders the
progress percentage value. When `isPrinting === false` or `progress === 0`, no progress
percentage is rendered.

**Validates: Requirement 9.7**

---

### Property 17: Keyboard shortcut tab activation

*For any* digit key `k` in `{1, 2, 3, 4, 5, 6}` pressed while no text input is focused, the
corresponding tab becomes active: 1 → machine, 2 → material, 3 → pattern, 4 → presets,
5 → gcode, 6 → console. Pressing any other key leaves all tabs unchanged.

**Validates: Requirements 10.1, 10.2**

---

### Property 18: Escape key closes modals

*For any* modal open state (`showHelpModal === true` or `showDictionary === true`), pressing
the Escape key sets that modal's state to `false`. If no modal is open, Escape has no effect.

**Validates: Requirement 10.8**

---

### Property 19: Interactive elements have aria-labels

*For any* button, tab, input, or select rendered by the application, the element has a
non-empty `aria-label` or `aria-labelledby` attribute that meaningfully describes the action
or value.

**Validates: Requirement 10.6**

---

## Error Handling

### Sidebar slide-over on mobile

If the user opens the sidebar on mobile and then resizes to desktop, the sidebar reverts to
its inline position. `setSidebarOpen(false)` is called in a `useEffect` triggered when
`window.innerWidth >= 1024` via a `resize` event listener.

### WebSerial state preservation

Because `PrinterConsole` stays mounted in the DOM at all times, no special handling is needed
for preserving the `messages` array or connection state when the user switches output tabs.
The `useWebSerial` hook remains untouched.

### Preset load with out-of-range PWM

This edge case is already handled in `PresetManager.handleLoadPreset` (clamping `powerMax`
to `pwmMax`). No changes needed.

### Empty generated results

`GenerateFAB` is disabled when `generatedResults === null`. Clicking while disabled does
nothing. The FAB's `onClick` handler guards with an early return:

```ts
const handleFABClick = () => {
  if (!generatedResults) return;
  handleDownloadGCode();
};
```

### Focus management for modals

When a modal opens, focus is programmatically moved to the modal's close button. When the
modal closes (via Escape or the close button), focus returns to the element that triggered it.
This is implemented with `useRef` pairs on each modal trigger.

### Keyboard shortcut conflicts with inputs

The keyboard shortcut handler guards against active `<input>`, `<select>`, `<textarea>`, and
`contenteditable` elements:

```ts
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    const isEditable = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) ||
                       (e.target as HTMLElement).isContentEditable;
    if (isEditable) return;

    switch (e.key) {
      case '1': setSidebarTab('machine');   break;
      case '2': setSidebarTab('material');  break;
      case '3': setCenterTab('pattern');    break;
      case '4': setCenterTab('presets');    break;
      case '5': setOutputTab('gcode');      break;
      case '6': setOutputTab('console');    break;
      case 'Escape':
        setShowHelpModal(false);
        setShowDictionary(false);
        break;
    }
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, []); // stable React state setters are safe in empty dep array
```

---

## Visual Design System

### Design Tokens

These tokens translate directly to Tailwind utility classes or CSS custom properties in
`src/index.css`. No new Tailwind config changes are needed — all values are covered by the
existing Tailwind scale.

#### Color Palette

| Token | Value | Usage |
|---|---|---|
| `--color-accent` | `#DC2626` (red-600) | Active tabs, selected patterns, primary buttons |
| `--color-surface-1` | `#0A0A0A` | Page background |
| `--color-surface-2` | `#0E0E0E` | Header, status bar, sidebar background |
| `--color-surface-3` | `#151515` | Panel cards |
| `--color-surface-4` | `#1A1A1A` | Section backgrounds, form fields |
| `--color-border` | `rgba(255,255,255,0.08)` | All panel card borders |
| `--color-border-subtle` | `rgba(255,255,255,0.05)` | Section dividers |
| `--color-text-primary` | `#E0E0E0` | Body text |
| `--color-text-secondary` | `#888888` | Labels, helper text |
| `--color-text-muted` | `#555555` | Disabled, placeholder |
| `--color-connected` | `#10B981` (emerald-500) | Connected status indicator |
| `--color-connecting` | `#F59E0B` (amber-400) | Connecting/transitional status indicator |

#### Spacing Scale

| Usage | Value | Tailwind |
|---|---|---|
| Between major panel regions | 16 px | `gap-4` / `p-4` |
| Between controls within a panel | 12 px | `gap-3` / `space-y-3` |
| Between label and input | 8 px | `gap-2` / `mb-2` |
| Panel card padding | 20 px | `p-5` |
| Section header padding | 12 px vertical, 16 px horizontal | `py-3 px-4` |

#### Typography

| Element | Size | Weight | Class |
|---|---|---|---|
| Panel heading | 13 px | 600 | `text-[13px] font-semibold uppercase tracking-wide` |
| Section heading | 12 px | 600 | `text-xs font-semibold uppercase tracking-wider` |
| Body / input | 13 px | 400 | `text-[13px]` |
| Label (label-caps) | 11 px | 600 | `text-[11px] font-semibold uppercase tracking-wider` |
| Helper / secondary | 10 px | 400 | `text-[10px]` |
| Status bar | 10 px | 500 mono | `text-[10px] font-mono font-medium` |

#### Border Radius

| Element | Radius |
|---|---|
| Panel cards | 8 px (`rounded-lg`) |
| Section containers | 6 px (`rounded-md`) |
| Buttons, inputs | 4 px (`rounded`) |
| Tab bar | 8 px outer, 0 inner (`rounded-t-lg`) |
| FAB | 9999 px (`rounded-full`) or 12 px (`rounded-xl`) |
| Status bar | 0 (flush edge-to-edge) |

#### Active Edit Mode Highlight (Req 6.7)

When a panel is in edit mode (e.g., `isEditing === true` in `MachineSelector`), the panel card
gets a left-side accent border:

```tsx
className={`border rounded-lg ... ${isEditing ? 'border-l-2 border-l-red-600' : 'border-white/8'}`}
```

The overall card background does **not** change colour.

### Tab Bar Design

All three tab bars (Sidebar, Center, Output) share the same visual pattern:

```
┌──────────────────────────────────────────────────┐
│  [Machine]  [Material]                           │  ← SidebarTabBar
│  ──────────                                      │  ← active tab: red 2px bottom border
└──────────────────────────────────────────────────┘
```

```tsx
// Shared TabBar pattern
<div role="tablist" className="flex border-b border-white/8">
  <button
    role="tab"
    aria-selected={activeTab === 'machine'}
    aria-controls="panel-machine"
    onClick={() => onTabChange('machine')}
    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors
      ${activeTab === 'machine'
        ? 'border-b-2 border-red-600 text-white'
        : 'text-[#888] hover:text-[#E0E0E0]'
      }`}
  >
    Machine
  </button>
  ...
</div>
```

### Collapsible Section Pattern (MachineSelector)

```
┌─ Section Header ──────────────────────────────── [▼] ─┐
│  Bed Geometry                                          │
└────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────┐
  │  [content when expanded]                            │
  └─────────────────────────────────────────────────────┘
```

```tsx
<div className="border-t border-white/5">
  <button
    aria-expanded={!collapsed}
    aria-controls={`section-${key}`}
    onClick={() => toggleSection(key)}
    className="w-full flex items-center justify-between py-2.5 px-0 text-xs font-semibold
               uppercase tracking-wider text-[#888] hover:text-white transition-colors"
  >
    <span>{label}</span>
    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
  </button>
  <div id={`section-${key}`} className={collapsed ? 'hidden' : 'space-y-3 pb-3'}>
    {children}
  </div>
</div>
```

---

## Responsive Breakpoint Strategy

### Tailwind Breakpoint Usage

The design uses only the three standard Tailwind breakpoints: `sm` (640 px), `md` (768 px),
`lg` (1024 px). No custom breakpoints are added.

| Breakpoint | Primary structural class changes |
|---|---|
| Default (< 640 px) | Single column stack, full-width panels, sidebar hidden behind slide-over |
| `md:` (≥ 768 px) | Two-column: left half = sidebar + center stacked, right half = canvas + output |
| `lg:` (≥ 1024 px) | Three-column: sidebar fixed-width · center fixed-width · canvas flex-1 |

### Sidebar Collapse on Mobile

```
isOpen === false  →  translate-x-full  (off-screen left)
isOpen === true   →  translate-x-0 + backdrop overlay
```

The toggle button (`☰` icon) appears in the header on viewports < `lg`. It sets
`setSidebarOpen(true)`. A backdrop `<div>` with `onClick={() => setSidebarOpen(false)}`
handles dismiss-on-outside-click.

### Touch Target Sizes (Req 7.5)

All tab buttons, section headers, collapse toggles, and FAB enforce a minimum 44 × 44 px tap
target using:

```tsx
className="min-h-[44px] min-w-[44px]"
// or padding-based on text buttons:
className="py-3 px-4" // ≥ 44px height naturally
```

### SVGVisualizer Minimum Heights

| Viewport | Min height |
|---|---|
| ≥ 768 px | 400 px (`min-h-[400px]`) |
| < 768 px | 300 px (`min-h-[300px]`) |

Tailwind: `className="min-h-[300px] md:min-h-[400px]"`.

### No Horizontal Scroll (Req 7.4)

The `Workspace` container uses `overflow-x-hidden` and each column uses `min-w-0` to prevent
flex children from exceeding their column width. Long text in status bar items is truncated
with `truncate` utilities.

---

## Keyboard Shortcut Implementation

### Implementation Location

A single `useEffect` in `App.tsx` handles all keyboard interactions. It is registered on
`window` and uses a dependency array of `[]` (mounted once, handlers reference stable setters
from `useState`).

```ts
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    // Do not fire shortcuts when user is typing in a form field
    const tag = (e.target as HTMLElement).tagName;
    const isEditable = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) ||
                       (e.target as HTMLElement).isContentEditable;
    if (isEditable) return;

    switch (e.key) {
      case '1': setSidebarTab('machine');   break;
      case '2': setSidebarTab('material');  break;
      case '3': setCenterTab('pattern');    break;
      case '4': setCenterTab('presets');    break;
      case '5': setOutputTab('gcode');      break;
      case '6': setOutputTab('console');    break;
      case 'Escape':
        setShowHelpModal(false);
        setShowDictionary(false);
        break;
    }
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, []); // stable React state setters are safe in empty dep array
```

### Shortcut Reference

| Key | Action | Requirement |
|---|---|---|
| `1` | Activate Machine tab (sidebar) | 10.1 |
| `2` | Activate Material tab (sidebar) | 10.1 |
| `3` | Activate Pattern tab (center) | 10.1 |
| `4` | Activate Presets tab (center) | 10.1 |
| `5` | Activate G-Code tab (output) | 10.1 |
| `6` | Activate Console tab (output) | 10.1 |
| `Escape` | Close open modal | 10.8 |

### Focus Ring Visibility

Add to `src/index.css` (or extend the existing global styles):

```css
/* Ensure focus rings are visible for keyboard users */
:focus-visible {
  outline: 2px solid #DC2626;
  outline-offset: 2px;
}
```

This uses the existing accent red and is suppressed for mouse users via `:focus-visible`
(already the browser default in modern browsers). No additional library is needed.

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)

Focused on the new state logic, tab transitions, and the collapsible section invariant.
These are example-based, exercising specific inputs and checking precise outputs.

Example test targets:

- `LeftSidebar`: renders Machine tab active by default; clicking Material tab switches content
- `MachineSelector.toggleSection`: never produces an all-collapsed state
- `MachineSelector`: header renders machine name and firmware for any profile
- `MaterialDatabase`: summary row renders all **8** fields for any profile
- `App` integration: `onLoadPreset` sets `centerTab` to `'pattern'`
- `App` integration: `printGCode` sets `outputTab` to `'console'`
- `GenerateFAB`: disabled when `generatedResults === null`, enabled otherwise
- `StatusBar`: renders "CONNECTED" with green dot when `connectionState === 'connected'`
- `StatusBar`: renders "OFFLINE" with grey dot when `connectionState === 'offline'`
- `StatusBar`: renders "CONNECTING" with yellow dot when `connectionState === 'connecting'`

### Property-Based Tests (fast-check)

PBT is appropriate for this feature where behaviour must hold across a range of generated inputs.
Using [`fast-check`](https://github.com/dubzzz/fast-check) (already compatible with Vitest).

Each property-based test runs a minimum of 100 iterations.

**Tag format:** `// Feature: ui-redesign, Property N: <property_text>`

Targeted properties (derived from §Correctness Properties above):

**P1 — Sidebar tab mutual exclusivity**
```ts
// Feature: ui-redesign, Property 1: sidebar tab mutual exclusivity
fc.assert(fc.property(
  fc.constantFrom<SidebarTab>('machine', 'material'),
  (tab) => {
    const { getByTestId } = render(<LeftSidebar activeTab={tab} .../>);
    const machineVisible  = getByTestId('machine-panel').style.display !== 'none';
    const materialVisible = getByTestId('material-panel').style.display !== 'none';
    return machineVisible !== materialVisible; // exactly one is visible
  }
));
```

**P3 — Section collapse invariant**
```ts
// Feature: ui-redesign, Property 3: MachineSelector section collapse invariant
fc.assert(fc.property(
  fc.array(fc.constantFrom<SectionKey>('laserCommands','motionZ','bedGeometry','deltaKinematics'), {minLength: 1, maxLength: 20}),
  (actions) => {
    // Apply toggle sequence, then verify at least one is expanded
    const result = applyToggles(DEFAULT_COLLAPSED, actions);
    return Object.values(result).some(v => !v);
  }
));
```

**P10 — FAB enabled mirrors generatedResults**
```ts
// Feature: ui-redesign, Property 10: FAB enabled state mirrors generatedResults
fc.assert(fc.property(
  fc.option(fc.record({ gcode: fc.string(), paths: fc.array(fc.anything()) })),
  (results) => {
    const { getByRole } = render(<GenerateFAB disabled={results === null} .../>);
    const fab = getByRole('button', { name: /generate/i });
    return (fab as HTMLButtonElement).disabled === (results === null);
  }
));
```

**P15 — Status bar connection display (all three states)**
```ts
// Feature: ui-redesign, Property 15: status bar connection display
fc.assert(fc.property(
  fc.constantFrom<'connected' | 'offline' | 'connecting'>('connected', 'offline', 'connecting'),
  (state) => {
    const { getByTestId } = render(<StatusBar connectionState={state} .../>);
    const label = getByTestId('connection-label').textContent;
    if (state === 'connected')  return label === 'CONNECTED';
    if (state === 'offline')    return label === 'OFFLINE';
    if (state === 'connecting') return label === 'CONNECTING';
    return false;
  }
));
```

**P17 — Keyboard shortcut tab activation**
```ts
// Feature: ui-redesign, Property 17: keyboard shortcut tab activation
fc.assert(fc.property(
  fc.constantFrom('1','2','3','4','5','6'),
  (key) => {
    const { result } = renderHook(() => useTabShortcuts());
    act(() => { fireEvent.keyDown(window, { key }); });
    const expectedTab = { '1':'machine','2':'material','3':'pattern',
                          '4':'presets','5':'gcode','6':'console' }[key];
    return result.current.activeTab === expectedTab;
  }
));
```

**P18 — Escape key closes modals**
```ts
// Feature: ui-redesign, Property 18: Escape key closes modals
fc.assert(fc.property(
  fc.boolean(), // showHelpModal
  fc.boolean(), // showDictionary
  (helpOpen, dictOpen) => {
    // If either modal is open, Escape closes it
    const { result } = renderHook(() => useModalEscape({ helpOpen, dictOpen }));
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
    return !result.current.helpOpen && !result.current.dictOpen;
  }
));
```

### Accessibility Tests

- Use `axe-core` (via `@axe-core/react` or `vitest-axe`) to assert no WCAG violations on the
  rendered `App` component with each tab combination active.
- Verify all `<button>` and `<input>` elements have non-empty accessible names.

### Visual / Responsive Tests (Manual + Snapshot)

- Storybook stories for `LeftSidebar`, `CenterPanel`, `StatusBar`, `GenerateFAB` at each
  breakpoint.
- Snapshot tests for `StatusBar` rendering all three connection state variants
  (connected, offline, connecting) and the six indicator combinations.
- Manual verification of sidebar slide-over on a 768 px viewport.
- Manual verification that no horizontal scrollbar appears at 769 px.

> Note: Full WCAG compliance validation requires manual testing with assistive technologies
> and expert accessibility review beyond what automated tools can verify.
