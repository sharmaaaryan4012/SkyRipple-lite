# UX Ergonomics Audit (`/audit/ux-ergonomics-audit.md`)
**Auditor:** Principal UI/UX Architect & Frontend Systems Auditor  
**Scope:** Cognitive Load, User Click Paths & Interaction Friction, Empty States & Steady-State Handling  
**Target:** SkyRipple OCC 3-View Cockpit Migration

---

## 1. Executive Summary
While the 3-view layout creates clear spatial separation, the user journey suffers from **cognitive overload in View 2**, **navigational friction in the Guided Tour**, and a **critical empty-state data bug** where steady-state nominal operations generate synthetic dummy carrier losses instead of a true baseline state.

---

## 2. Cognitive Load & Visual Hierarchy

### 2.1 View 2 (Explainability & Deterministic Audit) Redundancy
View 2 is divided into a 50/50 split between `DeterministicValidationCard.tsx` (left) and `AgentRecoveryLedger.tsx` (right).

```
+------------------------------------------+------------------------------------------+
| LEFT COLUMN: Deterministic Validation    | RIGHT COLUMN: Agent Recovery Ledger      |
|                                          |                                          |
| Net Recovery Delta: +$145,000 [KPI Card] | Net Value Saved:    +$145,000 [KPI Card] |
| Resolution Latency: < 20s     [KPI Card] | Unmitigated:        $181,375  [KPI Card] |
| Invariants Checklist (5 rows)            | Recovered Cost:     $36,375   [KPI Card] |
|                                          | Dynamic Efficiency Progress Bar          |
| Unmitigated:        $181,375 [Footer]    | 6 Role Filter Buttons                    |
| Post-Arbitration:   $36,375  [Footer]    | Scrollable Feed Cards (500px)            |
|                                          | Operator Constraint Input & Preset Chips |
| [EMPTY VOID (approx. 700px)]             | Duty Manager Consensus Footer            |
+------------------------------------------+------------------------------------------+
```

#### Diagnostic Findings:
1. **Direct Metric Duplication:** Within a 200px horizontal span, the exact same three financial metrics are rendered twice:
   * Left: `Net Recovery Delta: +$145,000` / `Unmitigated: $181,375` / `Post-Arbitration: $36,375`
   * Right: `Net Value Saved: +$145,000` / `Unmitigated: $181,375` / `Recovered Cost: $36,375`
2. **Asymmetric Scroll Void:** `DeterministicValidationCard` is ~380px tall and anchored with `lg:sticky lg:top-6`. `AgentRecoveryLedger` is ~1100px tall. Once the user scrolls past the top 400px of the ledger feed, the entire left half of an ultra-wide or desktop display becomes an empty slate void.
3. **Competing Action Centers:** In the right column alone, the user is confronted with a replay button, a view toggle (Cards vs Terminal), 6 filter buttons, an interactive text input with 5 chips, and a scrollable card feed. This creates sensory overload for an executive looking for high-level explainability.

### 2.2 View 3 (Financial Analytics) Siloed Telemetry
* **Zero Cross-Filtering:** In `FinancialAnalyticsView.tsx`, the `CarrierDonutChart` and `CarrierBreakdownTable` both present carrier exposure. However, clicking an airline slice in the donut does not filter, highlight, or sort the carrier rows in the table below, nor does it isolate the carrier's line on `CostTimeseriesChart`.
* **Temporal Disconnect:** View 3 displays a static 24-hour horizon cumulative total. It does not synchronize with the timeline scrubber in View 1, preventing the user from seeing financial exposure as of minute 480 vs minute 1200.

---

## 3. Click Paths & Interaction Friction

### 3.1 Workspace Switcher Numbering Discrepancy
There is a fundamental misalignment between UI labels, guided tour steps, and internal architecture:
* In `WorkspaceSwitcher.tsx` (lines 15-56):
  * **Tab 01:** Tactical Radar (`id: "radar"`)
  * **Tab 02:** Financial & Carrier Analytics (`id: "analytics"`)
  * **Tab 03:** Explainability & Audit (`id: "audit"`)
* In `ControlRoomApp.tsx` (lines 27-34) and initial project requirements:
  * **View 1:** Tactical Radar
  * **View 2:** Explainability & Audit
  * **View 3:** Financial & Carrier Analytics
* In `ResponsiveDashboardShell.tsx` (lines 350-364) (Mobile layout):
  * Tabs are named: `Scenarios` | `Analytics` | `Audit`
* **Executive Impact:** A user following architectural documentation or verbal walkthroughs expecting "View 2" for the multi-agent audit is dropped into Financial Analytics.

### 3.2 Guided Tour Modal UX Pitfalls
* **Aggressive First-Load Interruption:** In `TopCommandBar.tsx` (lines 26-34), `skyripple_guided_tour_seen` triggers an automatic modal pop-up on first boot. When an executive or recruiter loads the simulator, their immediate view of the live tactical map is blocked by a heavy modal.
* **Workspace Desynchronization on Dismissal:** If the user advances to Step 2 (which switches the workspace to `analytics`) and then clicks the close button (`&times;` or `Skip`), the modal unmounts but the workspace remains on `analytics`. The user is left in View 2 without having seen View 1's radar map.

### 3.3 Operator Constraint Injection: The "Placebo Effect"
In `AgentRecoveryLedger.tsx` (lines 386-400):
```tsx
function handleInjectConstraint(customPrompt?: string) {
  const textToInject = customPrompt || constraintInput.trim();
  if (!textToInject || isInjecting) return;
  setIsInjecting(true);
  const newConstraint = {
    id: `override-${Date.now()}`,
    text: textToInject,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  setInjectedConstraints((prev) => [newConstraint, ...prev]);
  setConstraintInput("");
  setIsInjecting(false);
}
```
* **The Failure:** Clicking "Inject" or selecting a chip (e.g., "Hold UA1184 15m") inserts a synthetic message claiming *"Agents dynamically re-arbitrating around this operational invariant."* However, **no simulation state changes**: total savings remain locked at $145K, flight delays on the map do not update, and downstream metrics are completely unaffected. This pseudo-interactive affordance breaks trust with technical auditors and recruiters.

### 3.4 Hidden Scenarios in Right Rail
In `PreloadedScenariosSidebar.tsx` (lines 28-71), only three options are exposed:
1. `ord-runway-closure`
2. `multi-disruption-cascade`
3. `baseline`
The multi-day month-long exports that exist on disk (`december-cascade` and `december-full`, which the application boots from) are **completely omitted from the selector list**. Once a user clicks `ord-runway-closure`, they have no UI mechanism to return to the multi-day December data.

---

## 4. Empty States & Nominal Airspace Handling

### 4.1 Critical Bug: Synthetic Mock Data Injected in Nominal State
In `CarrierDonutChart.tsx` (lines 38-49):
```tsx
if (total === 0) {
  // Fallback for steady-state / zero-disruption scenario
  return {
    slices: [
      { name: "UAL", value: 45, color: "#3B82F6", percentage: 45 },
      { name: "AAL", value: 30, color: "#EF4444", percentage: 30 },
      { name: "DAL", value: 15, color: "#10B981", percentage: 15 },
      { name: "SWA", value: 10, color: "#F59E0B", percentage: 10 },
    ],
    totalCost: 0,
  };
}
```
* **What is happening:** When the airspace is in a nominal, zero-disruption state (`total === 0`), the donut chart constructs four fake slices assigning 45% of delay exposure to United, 30% to American, 15% to Delta, and 10% to Southwest.
* **Why it looks like a bug:** The center donut label says "Nominal", but hovering over the United slice displays an active tooltip: `Impact: $45.00 | Carrier Share: 45%`. An executive inspecting the clean boot sees fictitious airline financial exposure rather than a clear "Zero Delay Delays — Operations Nominal" state.

### 4.2 Missing Empty State in Carrier Breakdown Table
In `CarrierBreakdownTable.tsx` (line 18), if `rows` is empty or all variances are zero, the component renders raw `<th>` headers above a completely blank `<tbody>`. There is no empty state illustration or reassurance that zero variance indicates optimal performance.

---

## 5. Strategic Architectural Recommendations
1. **Unify View Numbering:** Harmonize `WorkspaceSwitcher`, `GuidedTourModal`, and documentation to a single canonical sequence:
   * **View 1:** Tactical Radar (`radar`)
   * **View 2:** Financial Analytics (`analytics`)
   * **View 3:** Explainability & Audit (`audit`)
2. **De-duplicate View 2:** Strip the redundant KPI cards (`Unmitigated`, `Net Value Saved`, `Recovered Cost`) out of `AgentRecoveryLedger`. Let `DeterministicValidationCard` own the invariant metrics, and dedicate the right rail solely to the multi-agent arbitration stream.
3. **Fix Carrier Donut Empty State:** When `totalCost === 0`, render a single neutral concentric slate ring (`#1e293b`) with centered typography: *"Airspace Nominal — $0 Variance"*, suppressing interactive tooltip slices entirely.
4. **Transparent Constraints Affordance:** Either connect operator constraint injection to a mock recalculation worker or label the injection panel clearly as *"Demonstration Sandbox (Static Simulation Mode)"* with an explicit tooltip explaining that solver re-run requires backend compute.
