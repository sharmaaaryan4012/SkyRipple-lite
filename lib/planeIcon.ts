/**
 * Task B (map overhaul): the single icon every plane on the map uses.
 * A minimal dart/chevron silhouette, nose pointing UP (north, angle 0)
 * in its own icon space -- USMap.tsx rotates it per-flight via its
 * computed bearing. White fill + `mask: true` on the IconLayer's icon
 * definition means deck.gl treats this as a single-channel alpha mask
 * and tints it per-instance via getColor (severity color), so ONE icon
 * asset serves every severity bucket -- no per-color image variants to
 * keep in sync with lib/severity.ts.
 *
 * Inlined as a data: URI (no network request, no public/ asset file to
 * manage) -- deck.gl's IconLayer auto-packing (getIcon returning
 * {url, ...}) loads it once and reuses the same atlas entry for every
 * instance, so this costs nothing per-flight at render time.
 */
// width/height (not just viewBox) are REQUIRED here -- without them the
// browser can't determine "natural dimensions" for an <img> built from
// this data: URI, and deck.gl's createImageBitmap() call throws
// (caught directly during this task's own verification: "The image
// element contains an SVG image without natural dimensions").
const PLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 1 L20 20 L12 16 L4 20 Z" fill="white"/></svg>`;

export const PLANE_ICON_URL = `data:image/svg+xml,${encodeURIComponent(PLANE_SVG)}`;
export const PLANE_ICON_SIZE = 24;

/** Simple planar compass bearing (0=north/up, 90=east/right) from
 * (originLon, originLat) to (destLon, destLat) -- consistent with
 * USMap.tsx's own existing "linear lat/lon interpolation, not true
 * great-circle" simplification (documented there: at continental-US
 * scale/zoom this reads indistinguishably from a great-circle bearing).
 * Not a real spherical bearing formula -- deliberately not, to match
 * the straight-line path the plane icon actually travels along. */
export function bearingDeg(originLon: number, originLat: number, destLon: number, destLat: number): number {
  const dLon = destLon - originLon;
  const dLat = destLat - originLat;
  if (dLon === 0 && dLat === 0) return 0;
  return (Math.atan2(dLon, dLat) * 180) / Math.PI;
}
