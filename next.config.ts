import type { NextConfig } from "next";

// Static export: the whole site builds down to plain HTML/CSS/JS in out/,
// deployable to Vercel's free static hosting (or any static host) with no
// Node server at runtime. This is why data loading (lib/loadScenario.ts)
// fetches JSON files from public/scenarios/ at request time in the browser,
// rather than relying on server-only Next.js features (route handlers,
// server actions, ISR),  none of those exist once the app is exported.
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true, // next/image's optimizer needs a server; static export has none
  },
  transpilePackages: ['react-pdf', 'pdfjs-dist'],
  webpack: (config) => {
    // Completely disable Webpack's devtool for this specific conflict
    config.devtool = false;
    // Fixes module not found for canvas when pdfjs-dist is loaded on the server
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
