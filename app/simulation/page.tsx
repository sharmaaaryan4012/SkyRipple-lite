"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ControlRoomApp } from "@/components/ControlRoomApp";

// Which precomputed export ControlRoomApp fetches baseline data FROM on
// boot -- NOT "the scenario the app boots into" (Fix 1, clean-slate boot):
// SimulationProvider transforms whatever this points to into a clean
// baseline presentation (lib/bootState.ts) before anything renders it. Any
// precomputed export works here since baseline data is day-invariant.
//
// Points at the multi-day december-cascade export (rather than the
// single-day ord-runway-closure) so the day/week/month view toggle (Task
// 8b) and the rest of the month-long feature set are visible from the
// very first load, not hidden behind the `?scenario=...&raw=1` verification-
// only URL param -- bootState.ts's own clean-boot transform explicitly
// preserves meta.startDay/endDay for exactly this reason (see its own
// docstring). The clean boot still zeroes every disruption-driven figure
// ($0, 0 min, "no disruption injected yet") -- only the underlying date
// COVERAGE comes from this export, never its disruption/cost data.
const BOOT_DATA_SOURCE_SCENARIO_ID = "december-full";

/**
 * Task 8b verification affordance ONLY: `?scenario=<slug>` overrides which
 * precomputed export boots (still cleaned, same as ever, unless paired
 * with `?raw=1`); `?raw=1` skips the clean-boot transform entirely, so a
 * scenario's REAL data (real disruption markers, real multi-day coverage)
 * renders as-is -- the only way to see a multi-day scenario's actual
 * toggle behavior against real data, since live chat-driven results are
 * always single-day and the normal boot flow always cleans (see
 * components/SimulationProvider.tsx's own docstring). Neither param is
 * ever set by anything in the app itself -- omitting both reproduces the
 * exact pre-8b default boot behavior, unchanged.
 *
 * useSearchParams() (a CLIENT hook, read after hydration) rather than the
 * server-side `searchParams` prop: this app is a fully static export
 * (next.config.ts's `output: "export"`, no server at request time), which
 * outright rejects any server-side dynamic API including searchParams --
 * confirmed by this exact attempt during Task 8b's own development
 * ("couldn't be rendered statically because it used searchParams.then").
 * Wrapped in Suspense per Next's own requirement for useSearchParams in a
 * static export (the boundary is invisible here since ControlRoomApp
 * already renders its own loading placeholders).
 */
function HomeInner() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("scenario") || BOOT_DATA_SOURCE_SCENARIO_ID;
  const skipCleanBoot = searchParams.get("raw") === "1"; // default false (clean boot), requires ?raw=1 to skip
  return <ControlRoomApp bootDataSourceScenarioId={scenarioId} skipCleanBoot={skipCleanBoot} />;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
