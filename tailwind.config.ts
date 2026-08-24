import type { Config } from "tailwindcss";

// Every token here comes directly from the approved design reference v2
// (delay-sim-design-reference-v2.html),  the WHITE-primary re-theme.
// Nothing is invented,  colors, font stacks, and the type scale are
// copied verbatim so every surface that uses Tailwind classes
// (bg-surface, text-aubergine, font-display, text-lg…) automatically
// inherits the system instead of hardcoding hex values.
//
// v1 -> v2 rename (not just new hex values): the OLD dark theme named
// tokens after their v1 ROLE on a dark page (`ink` = dark page bg,
// `white` = primary text, `structural`/`structural-text` = two purple
// accent shades). Under v2 the page is WHITE and the ink is AUBERGINE, 
// keeping the old names would mean `bg-ink` rendering white and
// `text-white` rendering aubergine, which is actively misleading to
// read in every component file. Renamed to match the reference's own
// CSS variable names exactly (`--page`, `--aubergine`, `--aubergine-soft`,
// `--elevated`, `--map-canvas`, `--gold-deep`) instead. `structural` and
// `structural-text` (two separate purple shades in v1) consolidate into
// the single `aubergine-soft` v2 defines for that whole role.
//
// THE MAP STAYS DARK: `map-canvas` (#2A0E31) is the v2 reference's
// explicitly named "only dark surface",  components/map/USMap.tsx uses
// this (as RGB, deck.gl doesn't take Tailwind classes) for the map's own
// background/basemap fill, while every OTHER surface in the app now
// sits on `page`/`surface`/`elevated` (white/off-white/warm-elevated).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#FFFFFF", // page background (was `ink`)
        surface: "#F7F4F0", // panels,  warm off-white
        elevated: "#EFEAE3", // hover / raised state (was `surface-elevated`)
        border: "#E4DCE6", // 1px hairline dividers,  the default border color
        "border-strong": "#D6C9DA", // a stronger hairline, for e.g. secondary buttons
        aubergine: "#4A1E52", // primary text/ink (was `white`)
        "aubergine-soft": "#6A3B72", // secondary structural accent + quiet labels (was `structural` + `structural-text`)
        red: "#C1121F", // disrupted / cost,  never decorative
        "red-soft": "#E8677A", // (was `red-text`)
        gold: "#C79A3F", // recovered / value,  FILLS AND CTAs ONLY, never small text on white (fails contrast),  see `gold-deep`
        "gold-deep": "#9A7420", // gold when it must be text/a label on white (the reference's own documented exception)
        "gold-hover": "#B5883A",
        "map-canvas": "#2A0E31", // the map's own dark background,  see module note above
        muted: "#7A6E82", // secondary text
        sev: {
          ontime: "#8A8194",
          minor: "#C79A3F",
          mod: "#D07B2E",
          severe: "#C1121F",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"], // Space Grotesk
        body: ["var(--font-body)", "sans-serif"], // Inter
        mono: ["var(--font-mono)", "monospace"], // IBM Plex Mono
      },
      fontSize: {
        // The reference's fixed type scale: 12/14/16/20/26/34/48px.
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "20px",
        xl: "26px",
        "2xl": "34px",
        "3xl": "48px",
      },
      transitionDuration: {
        DEFAULT: "300ms", // "motion reports a state change, it doesn't perform one"
        reveal: "700ms", // the ONE springy moment -- the recovery before/after reveal, see RecoveryPanel.tsx
      },
      transitionTimingFunction: {
        DEFAULT: "ease-out", // no springs/overshoot outside the (later) before/after reveal
        // A slight overshoot-and-settle (classic "easeOutBack"), reserved
        // for `duration-reveal` only -- the recovery reveal is the ONE
        // place the app is allowed to "perform." Every other transition
        // in the app stays on the DEFAULT ease-out above.
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
