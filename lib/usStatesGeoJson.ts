import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
// us-atlas ships pre-built Census Bureau TopoJSON as a plain JSON file, 
// imported directly (bundled at build time) rather than fetched at
// runtime, so the basemap has no external tile-server/network dependency
// at all (works offline, in a static export, everywhere).
import usStatesTopology from "us-atlas/states-10m.json";

/**
 * The lower-48-plus-AK/HI state boundaries as GeoJSON, converted once
 * from TopoJSON at module load (not per-render,  see components/map/
 * USMap.tsx, which imports this constant directly rather than
 * recomputing it).
 */
export const US_STATES_GEOJSON = feature(
  usStatesTopology as unknown as Topology,
  (usStatesTopology as unknown as Topology).objects.states as GeometryCollection
) as FeatureCollection<Geometry>;
