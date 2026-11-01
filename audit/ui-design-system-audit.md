# UI Design System Audit (`/audit/ui-design-system-audit.md`)
**Auditor:** Principal UI/UX Architect & Frontend Systems Auditor  
**Scope:** Visual Consistency, Tailwind Tokens, Z-Index/Stacking Contexts, Typography & Contrast Hierarchy  
**Target:** SkyRipple OCC 3-View Cockpit Migration

---

## 1. Executive Summary
The SkyRipple OCC migration to the 3-view Executive Cockpit intended to unify the interface around a disciplined, dark navy/slate aerospace aesthetic (`#0A1128` canvas, slate chrome) with restrained semantic color usage. However, the audit reveals a **bifurcated design system ("split personality")** across the codebase: legacy design tokens (`aubergine`, `gold`, `surface`, `border`) coexist and clash directly with standard Tailwind `slate` tokens (`slate-900`, `slate-800`, `slate-950`). Furthermore, severe **z-index collisions** exist between developer overlays and critical navigation toggles, and typographic contrast drops below WCAG accessibility baselines on metadata micro-copy.

---

## 2. Visual Consistency & Token Fragmentation

### 2.1 Dual Design System Collision
The application currently runs two mutually incompatible styling paradigms in parallel:

| Component Category | Token Paradigm Used | Color Palette | Example Files |
| :--- | :--- | :--- | :--- |
| **New Cockpit System** | Hardcoded Tailwind Slate | `bg-slate-950`, `bg-slate-900`, `border-slate-800`, `text-slate-300`, `text-white` | `TopCommandBar.tsx`, `WorkspaceSwitcher.tsx`, `DeterministicValidationCard.tsx`, `AgentRecoveryLedger.tsx` |
| **Legacy v1/v2 System** | Extended Tailwind Tokens | `bg-surface`, `bg-page`, `text-aubergine`, `text-aubergine-soft`, `bg-gold`, `border` | `FlightDeck.tsx`, `Panel.tsx`, `MonoStat.tsx`, `RangeValue.tsx`, `MapPanel.tsx` |

#### Specific Friction Points:
1. **Semantic Hijacking of `aubergine`:** In `tailwind.config.ts` (line 13), `aubergine` is defined as `#e2e8f0` (Tailwind `slate-200`) and `aubergine-soft` as `#94a3b8` (Tailwind `slate-400`). This legacy artifact masks underlying inconsistencies: `CarrierBreakdownTable.tsx` (line 48) applies `text-aubergine font-semibold`, while neighboring cells use `text-slate-200`.
2. **Inconsistent Border Alphas:** Elements styled under the legacy system use `border: rgba(255, 255, 255, 0.10)` (`tailwind.config.ts#L11`), while new cockpit elements use `border-slate-800` (`#1e293b`). In View 1, the FlightDeck container sits directly below the Map canvas with mismatched border color boundaries (10% translucent white abutting opaque slate-800).

### 2.2 Semantic Color Discipline Violations
The executive design rule stipulates: *Muted semantic colors (green/amber/rose) must ONLY be used for data deltas and operational states.* This rule is violated in multiple critical areas:
* **Active Horizon Button Styling:** In `FlightDeck.tsx` (line 92), the active view scale button ("DAY", "WEEK", "MONTH") is styled with `bg-gold text-page font-bold shadow-sm` (`#C5A059` warm mustard gold). It clashes with the cool slate-800 active state in `WorkspaceSwitcher.tsx` (line 95) and introduces a bright chromatic accent for navigation rather than data telemetry.
* **Dev Mode Switch:** In `TopCommandBar.tsx` (line 95), the switch pill activates with `bg-amber-400`, appropriating warning/caution amber for a debug toggle.
* **Workspace Badges:** In `WorkspaceSwitcher.tsx` (line 115), tab index pills use `bg-blue-950/60 text-blue-300 border-blue-800/60`, introducing an uncoordinated fourth accent hue alongside amber, emerald, and gold.

---

## 3. Z-Index Collisions & Stacking Context Hierarchy

A complete codebase scan revealed an uncoordinated stacking hierarchy spanning `z-0` to `z-[100]`, alongside a global grain overlay at `z-9998`:

```
z-9998: body::after film-grain (globals.css)
z-100:  Custom Cursor (cursor.tsx)
z-50:   GuidedTourModal / AboutModal / AirportDetailPanel / FloatingTopHudPill Modal
z-40:   TopCommandBar / MapPanel Scenario Popover / FloatingTopHud Backdrop
z-30:   ChatDock / Mobile Bottom Drawer / Timeline Tooltip / MapPanel Status
z-20:   Dev Mode HUD Overlay / Timeline Thumb / Mobile Timeline Bar
z-10:   Schedule Mode Selector / Timeline Track / Map Hover Boxes
z-0:    Map Canvas / Switcher Center Container (auto)
```

### Collision 1: Dev Mode HUD Overwrites Schedule Mode Selector
* **Location:** `USMap.tsx` (lines 665-666) vs `MapPanel.tsx` (line 290)
* **What happens:** In `USMap.tsx`, the Dev Mode telemetry overlay is positioned at `absolute top-16 lg:top-3 left-3 z-20`. In `MapPanel.tsx`, the Schedule Mode toggle ("Disrupted Schedule" vs "Recovered Schedule") is positioned at `absolute top-3 left-3 z-10`.
* **The Failure:** On desktop viewports, when Inspector/Dev Mode is active and recovery telemetry exists, the Dev Mode HUD (`z-20`) renders **directly on top** of the schedule mode buttons (`z-10`). Even though the Dev HUD has `pointer-events-none`, it completely masks the buttons, making it impossible for the user to read which schedule view is active.

### Collision 2: Top Command Bar Horizontal Stacking Failure
* **Location:** `TopCommandBar.tsx` (lines 52-85)
* **What happens:** Left brand identity (`z-10`) and right controls (`z-10`) sandwich the center `WorkspaceSwitcher` (`absolute left-1/2 -translate-x-1/2` with default `z-index: auto`).
* **The Failure:** On intermediate desktop screens (1024px–1280px), the 600px-wide switcher physically overlaps the left brand text and right dev toggle. Because left and right elements have `z-10` while the switcher has no z-index, the switcher buttons clip underneath the adjacent containers.

### Collision 3: Flat Modal Collisions at `z-50`
* **Location:** `GuidedTourModal.tsx` (line 148), `AboutModal.tsx` (line 19), `FloatingTopHudPill.tsx` (line 112), and `AirportDetailPanel.tsx` (line 90).
* **The Failure:** Four distinct modal/sheet surfaces share `z-50` with no global modal manager or React Portal orchestrator. If an airport is selected on mobile while the tour is open, DOM ordering dictates stacking, resulting in overlapping backdrops and un-dismissible overlays.

---

## 4. Typography & Executive Hierarchy
1. **Unbalanced Micro-Typography:** The application over-indexes on `text-[9px]`, `text-[10px]`, and `text-[11px]` labels (`DeterministicValidationCard.tsx#L87`, `CarrierDonutChart.tsx#L125`). On non-retina displays and smaller 13-inch laptop screens, these labels become illegible.
2. **WCAG Contrast Failures:** In `PreloadedScenariosSidebar.tsx` (line 104), subtext styled with `text-slate-400` or `text-slate-500` on `bg-slate-950` achieves a contrast ratio of ~3.6:1, failing WCAG AA (minimum 4.5:1 for body copy).
3. **Tabular Numeral Inconsistency:** While `font-variant-numeric: tabular-nums` is globally declared on `body` in `app/globals.css` (line 10), several KPI stat blocks override font classes to `font-display` or `font-sans` without setting `tabular-nums`, resulting in visible layout jitter during live count-up animations.

---

## 5. Strategic Architectural Recommendations
1. **Purge Legacy Tokens:** Completely deprecate `gold`, `aubergine`, `aubergine-soft`, `surface`, and `border` from `tailwind.config.ts`. Migrate all components exclusively to Tailwind `slate-950/900/800` backgrounds and `slate-200/400` typography.
2. **Standardize Layer Stacking via CSS Variables:** Establish a strict 6-tier z-index scale:
   `--z-base: 0`, `--z-overlay: 10`, `--z-sticky: 20`, `--z-header: 30`, `--z-drawer: 40`, `--z-modal: 50`.
3. **Enforce Semantic Palette Rules:** Restrict `emerald` exclusively to on-time/recovered states, `amber` to moderate delays/warnings, and `rose` to ground stops/severe cancellations. Navigation buttons must use neutral slate highlights (`bg-slate-800 text-white`).
