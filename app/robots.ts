import { MetadataRoute } from 'next';

// Static export (next.config.ts's output: "export") needs this to
// actually land as a real /robots.txt file instead of being skipped --
// see app/layout.tsx's own docstring for where this fix came from.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://skyripple.saaryan.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
