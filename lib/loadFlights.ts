import type { FlightsData } from "./types";

export async function loadFlights(slug: string, day?: string): Promise<FlightsData> {
  const file = day ? `flights/${day}.json` : 'flights.json';
  const res = await fetch(`/scenarios/${slug}/${file}`);
  if (!res.ok) {
    if (!day) {
      // fallback for multi-day that doesn't have a single flights.json
      return { severityThresholdsMin: { minor: 15, moderate: 45, severe: 90 }, flights: [] };
    }
    throw new Error(`failed to load flights for ${slug}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as FlightsData;
}
