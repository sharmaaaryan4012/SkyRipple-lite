# SkyRipple OCC Cockpit Architecture & UX Teardown
**Audit Mode:** Read-Only Static Diagnostic Analysis  
**Auditor Role:** Principal UI/UX Architect & Frontend Systems Auditor  
**Repositories:** `aviation-lite` & `aviation` (3-View Executive Cockpit Migration)

---

## Audit Directory Manifest

This directory contains the comprehensive findings of the frontend architecture and UX audit:

1. [`ui-design-system-audit.md`](./ui-design-system-audit.md)
   * Visual consistency & dual-token collision (Tailwind slate vs legacy tokens)
   * Semantic color violations & hierarchy discipline
   * Stacking context & z-index collisions (Dev Mode overlay vs Schedule selector)
   * Typography scale, tabular numerals, and WCAG contrast failures

2. [`ux-ergonomics-audit.md`](./ux-ergonomics-audit.md)
   * Cognitive load & metric redundancy in View 2 (Explainability)
   * Siloed telemetry & lack of cross-filtering in View 3 (Analytics)
   * Click paths, guided tour interruption, and workspace numbering confusion
   * Operator constraint injection "placebo effect"
   * Empty states & nominal airspace bugs (synthetic $45 carrier loss)

3. [`code-consistency-architecture.md`](./code-consistency-architecture.md)
   * Monolithic component creep (`AgentRecoveryLedger.tsx` at 820 lines, `ResponsiveDashboardShell.tsx` at 469 lines)
   * Technical debt: 450 lines of dead code in `AgentArbitrationFeed.tsx`
   * State management: render-prop chokepoint in `SimulationProvider` vs React Context
   * Dual-state desynchronization in shell & remounting performance penalties

4. [`responsive-edge-cases.md`](./responsive-edge-cases.md)
   * 13-inch laptop viewport degradation (top command bar collision, cramped KPI cards)
   * Ultra-wide 3440px monitor anomalies (1720px island, horizontal stretching)
   * Tablet portrait cliff at 1023px
   * Data overload: 500+ log stress test, lack of DOM virtualization, keystroke re-render cascades

---

## Prioritized Engineering Roadmap

| Priority | Vertical | Item / Finding | Core Recommendation | Files Impacted |
| :---: | :--- | :--- | :--- | :--- |
| **P0** | Design System | Dev Mode HUD blocks Schedule Toggle on Desktop | Shift Dev HUD position or stack below schedule toggle; ensure non-overlapping coordinates | `USMap.tsx`, `MapPanel.tsx` |
| **P0** | UX Ergonomics | Donut Chart synthesizes fake $45 carrier loss on clean boot | Render neutral "Nominal Airspace" state when total cost is $0; remove mock slices | `CarrierDonutChart.tsx` |
| **P0** | Responsive | Top Command Bar collapses center switcher on 13" laptops | Add responsive text truncation (`hidden xl:inline`) on switcher buttons; prevent absolute overflow | `TopCommandBar.tsx`, `WorkspaceSwitcher.tsx` |
| **P1** | Architecture | Dead code cluttering codebase | Safely delete unused `AgentArbitrationFeed.tsx` | `AgentArbitrationFeed.tsx` |
| **P1** | Scalability | 500+ logs cause DOM bloat & input typing lag | Virtualize feed or add pagination; isolate `constraintInput` state into a sub-component | `AgentRecoveryLedger.tsx` |
| **P1** | UX Ergonomics | View 2 KPI redundancy & asymmetric scroll void | Remove duplicated financial cards from `AgentRecoveryLedger`; let validation card own KPIs | `AgentRecoveryLedger.tsx` |
| **P2** | Design System | Legacy token collision (`gold`, `aubergine`, `surface`) | Consolidate entire styling system into Tailwind `slate-950/900/800` | `tailwind.config.ts`, `FlightDeck.tsx` |
| **P2** | Architecture | Prop drilling from `SimulationProvider` render prop | Refactor `SimulationProvider` to expose `useSimulation()` Context hook | `SimulationProvider.tsx`, `ControlRoomApp.tsx` |
