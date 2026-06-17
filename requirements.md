# Requirements Document

## Introduction

LaserBench is a browser-based laser calibration and G-code generation tool targeting diode laser engravers and cutters, including delta-kinematics machines. The current interface uses a fixed 12-column three-panel layout where all eight components (MachineSelector, MaterialDatabase, PatternConfigurator, PresetManager, SVGVisualizer, GCodeOutput, PrinterConsole, GCodeDictionary) are displayed simultaneously.

This creates a dense, overwhelming experience — each column scrolls independently and every section competes for the user's attention at once. The redesign goal is to reorganize the same feature set into a cleaner, more modern interface that reveals information progressively and groups related controls contextually, without removing any existing functionality.

The stack remains React + TypeScript + Vite + Tailwind. All existing component logic, G-code generation, WebSerial communication, and persistence behavior are preserved.

## Glossary

- **App**: The root LaserBench React application component.
- **Workspace**: The full-page area below the header that contains all tool panels.
- **Panel**: A discrete UI card grouping related controls (e.g., Machine Profile, Material Database).
- **Primary Toolbar**: The persistent header bar containing application-level navigation and actions.
- **Sidebar**: A collapsible vertical column housing configuration panels (machine, material).
- **Main Canvas Area**: The central section displaying the toolpath visualizer and G-code output.
- **Tab**: A clickable label that switches between sibling panels within the same container.
- **Section**: A collapsible sub-group within a Panel (e.g., Delta Kinematics within Machine Settings).
- **Toast**: A transient status notification appearing briefly without requiring user dismissal.
- **Active Panel**: The Panel currently visible when multiple Panels share a tabbed container.
- **Floating Action Button (FAB)**: A persistent primary action button that remains visible regardless of scroll position.
- **Status Bar**: A fixed-height bar at the bottom of the viewport displaying machine and job status indicators, replacing the current footer.

---

## Requirements

### Requirement 1: Tab-Based Left Sidebar for Configuration Panels

**User Story:** As a laser operator, I want the Machine and Material configuration panels grouped under tabs in a left sidebar, so that I can focus on one configuration context at a time without both panels competing for space.

#### Acceptance Criteria

1. THE App SHALL render a left sidebar containing two tabs: "Machine" and "Material".
2. WHEN the "Machine" tab is active, THE Sidebar SHALL display only the MachineSelector panel; the MaterialDatabase panel SHALL remain present in the DOM but hidden via CSS, preserving its state.
3. WHEN the "Material" tab is active, THE Sidebar SHALL display only the MaterialDatabase panel; the MachineSelector panel SHALL remain present in the DOM but hidden via CSS, preserving its state.
4. THE Sidebar SHALL default to the "Machine" tab on first load per session; tab state SHALL NOT persist across page reloads.
5. WHEN a machine profile field is changed or a new profile is selected, THE App SHALL retain the current sidebar tab value and SHALL NOT reset it to the default tab.
6. THE Sidebar SHALL maintain a flexible width within the range of 320px (minimum) to 420px (maximum) on desktop viewports (≥1024px wide).
7. WHEN the viewport width is less than 1024px, THE Sidebar SHALL be hidden from the normal document flow; THE App SHALL render a visible toggle button (hamburger icon with an accessible label) in the header that opens the Sidebar as a slide-over drawer, preserving the last-active tab when the drawer opens.
8. WHEN the slide-over Sidebar is open and the viewport is resized to 1024px or wider, THE App SHALL automatically close the slide-over and render the Sidebar inline without requiring user action.

---

### Requirement 2: Collapsible Sections Within Machine Settings

**User Story:** As a laser operator, I want the machine settings panel to collapse infrequently-used sections, so that the panel does not require extensive scrolling for routine use.

#### Acceptance Criteria

1. THE MachineSelector SHALL organize its edit-mode fields into four named collapsible sections: "Laser Commands" (laserOn, laserOff fields), "Motion & Z" (safeZ, workZ, travelSpeed, acceleration fields), "Bed Geometry" (bedShape, bedWidth, bedHeight, originX, originY fields), and "Delta Kinematics" (isDelta checkbox and all deltaRadius, deltaArmLength, deltaRodLength, deltaTowerAngleOffset, deltaPrintRadius fields).
2. WHEN a section header is clicked, THE MachineSelector SHALL toggle that section between expanded and collapsed states; a chevron indicator SHALL point downward when the section is expanded and rightward when collapsed.
3. WHEN the edit form is opened, THE "Laser Commands" section SHALL render in the collapsed state.
4. WHEN the edit form is opened, THE "Motion & Z" section SHALL render in the collapsed state.
5. WHEN the edit form is opened, THE "Bed Geometry" section SHALL render in the expanded state.
6. WHEN the edit form is opened, THE "Delta Kinematics" section SHALL render in the collapsed state; IF `isDelta` is already true when the form opens, THEN THE "Delta Kinematics" section SHALL render in the expanded state.
7. WHEN the Delta Kinematics checkbox is enabled (`isDelta` changes from false to true), THE MachineSelector SHALL render the "Delta Kinematics" section in the expanded state, even if it was previously collapsed by the user.
8. WHEN the Delta Kinematics checkbox is disabled (`isDelta` changes from true to false), THE MachineSelector SHALL render the "Delta Kinematics" section in the collapsed state.
9. THE MachineSelector SHALL display the active machine name, firmware type, PWM max value, machine profile dropdown, and New profile button in an always-visible header area that renders regardless of which sections are collapsed or whether edit mode is active; THE Delete profile button SHALL be visible in the header area only when more than one machine profile exists.
10. IF a user attempts to collapse the last remaining expanded section, THEN THE MachineSelector SHALL silently prevent that collapse action; all other section state changes SHALL proceed normally and no error message or visual feedback SHALL be shown to the user.

---

### Requirement 3: Pattern Configurator and Preset Manager as Tabbed Center Panel

**User Story:** As a laser operator, I want the Pattern Configurator and Preset Manager accessible in the center column under tabs, so that I can switch between configuring a pattern and loading a preset without scrolling past both stacked components.

#### Acceptance Criteria

1. THE App SHALL render a center panel with two tabs: "Pattern" and "Presets".
2. WHEN the "Pattern" tab is active, THE center panel SHALL display the PatternConfigurator component; the PresetManager component SHALL remain present in the DOM but hidden via CSS.
3. WHEN the "Presets" tab is active, THE center panel SHALL display the PresetManager component; the PatternConfigurator component SHALL remain present in the DOM but hidden via CSS.
4. THE center panel SHALL default to the "Pattern" tab on first load per session.
5. IF the "Pattern" tab is the active tab, THEN THE PatternConfigurator SHALL be visible and the PresetManager SHALL NOT be visible; it SHALL be impossible to reach a state where the "Pattern" tab is active and the PresetManager is visible.
6. WHEN a preset is loaded from the PresetManager, THE App SHALL switch the center panel to the "Pattern" tab in the same render cycle in which the preset values are applied, so that the loaded values are immediately visible.
7. THE center panel SHALL maintain a target column width of 320px to 420px on desktop viewports (≥1024px wide), matching the Sidebar column width; WHEN the viewport width is between 768px and 1023px, THE center panel SHALL be permitted to exceed 420px to maintain proper two-column layout behavior.

---

### Requirement 4: Expanded Main Canvas Area with Tabbed Output Panel

**User Story:** As a laser operator, I want the SVG toolpath visualizer to be large and prominent, with the G-code output accessible beneath it in a tab, so that the most visual and frequently-referenced content gets the most screen space.

#### Acceptance Criteria

1. THE App SHALL render the SVGVisualizer in a main canvas area that occupies the remaining horizontal space after the Sidebar and center panel columns.
2. THE Main Canvas Area SHALL maintain a minimum SVG canvas height of 400px on viewports ≥768px wide; WHEN the available viewport height is insufficient, THE canvas SHALL be independently scrollable to preserve the 400px minimum height.
3. THE App SHALL render a tabbed output panel directly below the SVGVisualizer containing two tabs: "G-Code" and "Console".
4. WHEN the "G-Code" tab is active, THE output panel SHALL render the GCodeOutput component as visible; the PrinterConsole component SHALL remain present in the DOM but hidden via CSS, preserving its WebSerial message state.
5. WHEN the "Console" tab is active, THE output panel SHALL render the PrinterConsole component as visible; the GCodeOutput component SHALL remain present in the DOM but hidden via CSS, preserving its scroll position.
6. THE output panel SHALL default to the "G-Code" tab on first load.
7. WHEN `isPrinting` transitions from false to true, THE App SHALL automatically switch the output panel to the "Console" tab regardless of which tab was previously active.
8. WHILE `isConnected` is true, THE App SHALL display a persistent green pulsing status badge on the "Console" tab label; WHEN `isConnected` becomes false, THE badge SHALL be removed in the same render cycle.
9. IF the user manually switches to the "G-Code" tab while `isPrinting` is true, THEN THE App SHALL allow the user to remain on the "G-Code" tab and SHALL NOT automatically switch back to the "Console" tab.
10. WHEN `isPrinting` transitions from true to false, THE output panel SHALL remain on whichever tab the user last selected and SHALL NOT automatically switch tabs.

---

### Requirement 5: Persistent Generate/Download Button as Floating Action Button

**User Story:** As a laser operator, I want a clearly visible download action always available regardless of scroll position, so that I can download the generated G-code file without hunting through the header.

#### Acceptance Criteria

1. THE App SHALL render a Floating Action Button (FAB) labeled "Generate" in the lower-right corner of the Workspace, positioned at least 16px from the right edge of the viewport and at least 16px above the Status Bar.
2. WHEN the FAB is clicked and `generatedResults` is not null, THE App SHALL trigger a download of the current G-code file.
3. WHEN `generatedResults` is not null, THE FAB SHALL render in an enabled visual state (full opacity, `aria-disabled="false"`); WHEN `generatedResults` is null, THE FAB SHALL render in a disabled visual state with opacity ≤ 50% and `aria-disabled="true"`, and SHALL NOT respond to click interactions.
4. THE FAB SHALL remain fixed relative to the viewport and SHALL remain visible during vertical scroll of any panel.
5. WHEN `estimatedTimeStr` is not null, THE FAB SHALL display the estimated burn time as a secondary label beneath the button text; WHEN `estimatedTimeStr` is null, no time label SHALL be rendered.
6. THE existing "GENERATE G-CODE" button in the header SHALL be removed; the FAB is the sole trigger for G-code download.

---

### Requirement 6: Modernized Visual Design System

**User Story:** As a laser operator, I want the interface to feel modern and clean with clear visual hierarchy, so that controls are easy to scan and the interface does not feel cluttered.

#### Acceptance Criteria

1. THE App SHALL use consistent spacing: 16px between major panel regions, 12px between controls within a panel, and 8px between a label and its associated input.
2. THE App SHALL use a single accent color (red, hex #DC2626) for all primary interactive state indicators: active tab underlines, selected pattern highlights, and primary action buttons.
3. THE App SHALL render panel cards with 8px border-radius and a 1px border using `rgba(255,255,255,0.08)`.
4. THE App SHALL render all within-panel collapsible section separators as 1px lines using `rgba(255,255,255,0.05)` rather than heavy borders or background color blocks.
5. THE App SHALL apply a consistent typographic scale: 11px for label-caps style labels, 12px for section headings, 13px for body text and inputs, 13px for panel headings.
6. THE App SHALL use icon-only buttons for secondary actions (zoom in/out, fit view, line number toggle) and reserve text labels for primary actions.
7. WHEN any panel is in an active edit mode (`isEditing` is true), THE App SHALL apply a 2px left-side accent border in `#DC2626` to that panel card while retaining the standard 1px `rgba(255,255,255,0.08)` border on the remaining three sides, rather than changing the card background color.

---

### Requirement 7: Responsive Layout for Tablet Viewports

**User Story:** As a laser operator working at a workshop bench, I want the interface to remain usable on a 10–12 inch tablet, so that I can use LaserBench without a full desktop screen.

#### Acceptance Criteria

1. WHEN the viewport width is 768px or greater and less than 1024px, THE App SHALL render in a two-column layout: a left column (minimum 300px, approximately 40% of viewport width) containing only the CenterPanel, and a right column containing the SVGVisualizer and output panel; the Sidebar SHALL remain accessible only via the slide-over drawer in this layout; at exactly 768px THE App SHALL use this two-column layout.
2. WHEN the viewport width is less than 768px, THE App SHALL render all panels in a single-column vertical stack in the following order: CenterPanel, SVGVisualizer, OutputPanel; the Sidebar SHALL be accessible only via the slide-over drawer mechanism defined in Requirement 1.7.
3. IF the viewport width is less than 768px, THEN THE SVGVisualizer SHALL maintain a minimum height of 300px; IF the viewport width is 768px or wider, THEN THE SVGVisualizer SHALL maintain a minimum height of 400px.
4. THE App SHALL not produce horizontal scrollbars on viewports wider than 320px; on viewports of 320px or narrower, horizontal scrollbars are permitted.
5. WHEN the device primary pointing mechanism is coarse (as detected by the `pointer: coarse` media feature), THE App SHALL ensure all interactive tap targets (buttons, tabs, section headers, FAB) have a minimum touch target area of 44px × 44px.

---

### Requirement 8: Streamlined Material Database Panel

**User Story:** As a laser operator, I want the Material Database panel to show the most important information at a glance without requiring scrolling just to see the basic material parameters, so that selecting a material feels quick rather than cumbersome.

#### Acceptance Criteria

1. WHILE the MaterialDatabase is not in edit mode, THE MaterialDatabase SHALL display all eight of the following fields in a compact summary row: material name, thickness, focus Z, laser rating, engrave power, engrave speed, cut power, and cut speed; none of these fields SHALL be omitted regardless of the field's value.
2. THE MaterialDatabase SHALL render the Calibration Log section in the collapsed state by default; THE MaterialDatabase SHALL display a toggle button labeled "Calibration Log" with an expand/collapse chevron that expands the section when clicked in its collapsed state and collapses it when clicked in its expanded state.
3. WHEN a material is selected from the category list, THE summary row SHALL reflect the newly selected material's data without requiring a tab switch, scroll action, or secondary confirmation.
4. WHEN the viewport width is 768px or wider, THE MaterialDatabase category tabs SHALL display both an icon and a text label; at exactly 768px THE tabs SHALL display both icon and text label; WHEN the viewport width is less than 768px, THE MaterialDatabase category tabs SHALL display the icon only; each category tab SHALL retain a descriptive `aria-label` with the full category name regardless of whether text is visible.
5. WHEN the viewport width is 768px or wider, THE MaterialDatabase SHALL display the material list and the summary row side-by-side within the sidebar panel; WHEN the viewport width is less than 768px, THE MaterialDatabase SHALL stack the material list above the summary row.

---

### Requirement 9: Status Bar Consolidation

**User Story:** As a laser operator, I want key machine status indicators consolidated in a compact, always-visible status bar, so that I don't need to look in multiple places to understand the current machine state.

#### Acceptance Criteria

1. THE App SHALL render a Status Bar fixed at the bottom of the viewport displaying all of the following six indicators at all times: connection status indicator, active machine name, firmware type, active material name, estimated burn time (the value of `estimatedTimeStr` when non-null, or a placeholder dash `—` when `estimatedTimeStr` is null), and a delta indicator showing the print radius (rendered only when `isDelta` is true).
2. THE Status Bar SHALL have a target height of 32px; the height SHALL NOT exceed 40px under any content condition.
3. WHEN `isConnected` is true, THE Status Bar SHALL render the connection status indicator as a green pulsing dot (`animate-pulse`, `bg-emerald-500`) labeled "CONNECTED".
4. WHEN `isConnected` is false, THE Status Bar SHALL render the connection status indicator as a grey static dot (`bg-zinc-500`) labeled "OFFLINE"; WHEN `isConnected` transitions from true to false, THE Status Bar SHALL update the indicator to the grey static dot within the same render cycle, removing any pulsing animation.
5. WHEN the WebSerial connection is in a transitional state (connecting or reconnecting, as indicated by a dedicated `connectionState` prop value of `'connecting'`), THE Status Bar SHALL render the connection status indicator as a yellow pulsing dot (`animate-pulse`, `bg-amber-400`) labeled "CONNECTING".
6. THE Status Bar SHALL replace the existing footer element; the existing footer displaying raw G-code debug metadata (BUFFER: READY, Z-FOCUS, LASER) SHALL be removed from the App.
7. WHEN `isPrinting` is true AND `progress` is greater than 0 AND less than 100, THE Status Bar SHALL display the progress percentage alongside the estimated remaining time.
8. WHEN `isPrinting` is true AND `progress` is 0 OR `progress` is 100, THE Status Bar SHALL display a "PRINTING…" text indicator without a numerical progress value.
9. WHEN `isPrinting` is false, THE Status Bar SHALL NOT display any print progress indicator.

---

### Requirement 10: Accessibility and Keyboard Navigation

**User Story:** As a laser operator, I want to be able to navigate between panels and tabs using keyboard controls, so that I can operate the application efficiently without relying solely on mouse input.

#### Acceptance Criteria

1. THE App SHALL assign single-key keyboard shortcuts: `1` to activate the Machine sidebar tab, `2` to activate the Material sidebar tab, `3` to activate the Pattern center tab, `4` to activate the Presets center tab, `5` to activate the G-Code output tab, `6` to activate the Console output tab.
2. WHEN a keyboard shortcut key (`1`–`6`) is pressed while no form element has focus, THE App SHALL switch the corresponding tab to the active state within 100ms; the resulting visual state SHALL be identical to clicking the tab with a pointer.
3. WHEN a keyboard shortcut key is pressed while focus is inside an `<input>`, `<textarea>`, `<select>`, or any `contenteditable` element, THE App SHALL NOT activate the corresponding tab and SHALL allow the key press to be handled by the focused element normally.
4. THE App SHALL support Tab key navigation between all interactive controls in logical DOM order; WITHIN each `role="tablist"` container, THE App SHALL support Left/Right arrow key navigation between tabs in accordance with the ARIA Authoring Practices tab pattern.
5. THE App SHALL render a visible focus ring on all interactive elements when they receive keyboard focus; focus rings SHALL use a color achieving a minimum 3:1 contrast ratio against the panel background (per WCAG 1.4.11).
6. ALL interactive elements (buttons, tabs, inputs, selects) SHALL have either a non-empty `aria-label` attribute or an associated `<label>` element whose text unambiguously identifies the element's purpose or target.
7. ALL tab container elements SHALL use `role="tablist"` on the container, `role="tab"` on each tab button with `aria-selected` set to `"true"` for the active tab and `"false"` for inactive tabs, and `role="tabpanel"` with a matching `aria-labelledby` pointing to the active tab's `id` on each tab content panel.
8. THE App SHALL support the Escape key to close any open modal dialog; WHEN the Help modal is open and Escape is pressed, THE App SHALL close the Help modal; WHEN the G-Code Dictionary modal is open and Escape is pressed, THE App SHALL close the Dictionary modal; WHEN no modal is open, Escape SHALL have no effect.
9. WHEN a modal dialog opens, THE App SHALL move keyboard focus to the modal's primary interactive element (close button or first focusable control); keyboard focus SHALL be trapped within the modal while it is open, preventing Tab navigation from leaving the modal.
10. WHEN a modal dialog closes (via Escape or the close button), THE App SHALL return keyboard focus to the element that triggered the modal to open.
