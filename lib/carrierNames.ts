/** BTS carrier codes -> common names and full official airline names.
 * Maps both 2-letter IATA and 3-letter ICAO codes used across
 * BTS telemetry, flight schedules, and financial ledger data.
 */
export const CARRIER_NAMES: Record<string, string> = {
  AA: "American",
  AS: "Alaska",
  B6: "JetBlue",
  DL: "Delta",
  F9: "Frontier",
  G4: "Allegiant",
  HA: "Hawaiian",
  MQ: "Envoy",
  NK: "Spirit",
  OH: "PSA",
  OO: "SkyWest",
  UA: "United",
  WN: "Southwest",
  YX: "Republic",
  // 3-letter ICAO codes
  AAL: "American",
  ASA: "Alaska",
  JBU: "JetBlue",
  DAL: "Delta",
  FFT: "Frontier",
  AAY: "Allegiant",
  HAL: "Hawaiian",
  ENY: "Envoy",
  NKS: "Spirit",
  JIA: "PSA",
  SKW: "SkyWest",
  UAL: "United",
  SWA: "Southwest",
  RPA: "Republic",
};

/** Full official string names for executive analytics displays (pie & line charts). */
export const FULL_CARRIER_NAMES: Record<string, string> = {
  // 3-letter ICAO
  UAL: "United Airlines",
  AAL: "American Airlines",
  DAL: "Delta Air Lines",
  SWA: "Southwest Airlines",
  ASA: "Alaska Airlines",
  JBU: "JetBlue Airways",
  FFT: "Frontier Airlines",
  AAY: "Allegiant Air",
  HAL: "Hawaiian Airlines",
  ENY: "Envoy Air",
  NKS: "Spirit Airlines",
  JIA: "PSA Airlines",
  SKW: "SkyWest Airlines",
  RPA: "Republic Airways",
  // 2-letter IATA
  UA: "United Airlines",
  AA: "American Airlines",
  DL: "Delta Air Lines",
  WN: "Southwest Airlines",
  AS: "Alaska Airlines",
  B6: "JetBlue Airways",
  F9: "Frontier Airlines",
  G4: "Allegiant Air",
  HA: "Hawaiian Airlines",
  MQ: "Envoy Air",
  NK: "Spirit Airlines",
  OH: "PSA Airlines",
  OO: "SkyWest Airlines",
  YX: "Republic Airways",
};

/** Resolves any 2-letter or 3-letter carrier code to its full official name. */
export function getFullCarrierName(code: string): string {
  if (!code) return "";
  const upper = code.toUpperCase().trim();
  return FULL_CARRIER_NAMES[upper] || CARRIER_NAMES[upper] || code;
}

/** Reverse lookup: a lowercase name/alias fragment -> carrier code. */
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(CARRIER_NAMES).map(([code, name]) => [name.toLowerCase(), code])
);

/** Finds a carrier code mentioned in free text, by CODE or by NAME. */
export function findCarrierCodeInText(text: string): string | null {
  const upper = text.toUpperCase();
  for (const code of Object.keys(CARRIER_NAMES)) {
    if (new RegExp(`\\b${code}\\b`).test(upper)) return code;
  }
  const lower = text.toLowerCase();
  for (const [name, code] of Object.entries(NAME_TO_CODE)) {
    if (lower.includes(name)) return code;
  }
  return null;
}
