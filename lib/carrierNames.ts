/** BTS carrier codes -> common names, for the chat's Q&A parsing (a
 * user asking "what did it cost United?" needs "united" mapped back to
 * "UA" before looking up ledgerByCarrier). Limited to carriers that
 * actually appear in this project's data (models/reference's own
 * carriers table); not a general airline directory. */
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
};

/** Reverse lookup: a lowercase name/alias fragment -> carrier code. */
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(CARRIER_NAMES).map(([code, name]) => [name.toLowerCase(), code])
);

/** Finds a carrier code mentioned in free text, by CODE (word-boundary,
 * case-insensitive, e.g. "UA" or "ua") or by NAME (e.g. "united"). */
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
