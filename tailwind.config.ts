import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#0A1128",
        surface: "#0A1128", 
        elevated: "rgba(255, 255, 255, 0.03)", 
        border: "rgba(255, 255, 255, 0.10)", 
        "border-strong": "rgba(197, 160, 89, 0.20)", 
        aubergine: "#e2e8f0", // slate-200
        "aubergine-soft": "#94a3b8", // slate-400
        red: "#EF4444", 
        "red-soft": "#F87171", 
        gold: "#C5A059", 
        "gold-deep": "#C5A059", 
        "gold-hover": "#ffffff", 
        "map-canvas": "#0A1128", 
        muted: "#64748B", // slate-500
        sev: {
          ontime: "#94A3B8",
          minor: "#C5A059",
          mod: "#F59E0B",
          severe: "#EF4444",
        },
      },
      fontFamily: {
        display: ["var(--font-geist-sans)", "sans-serif"], 
        body: ["var(--font-geist-sans)", "sans-serif"], 
        mono: ["var(--font-geist-mono)", "monospace"], 
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        base: "16px",
        lg: "20px",
        xl: "26px",
        "2xl": "34px",
        "3xl": "48px",
      },
      transitionDuration: {
        DEFAULT: "300ms", 
        reveal: "700ms", 
      },
      transitionTimingFunction: {
        DEFAULT: "ease-out", 
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
