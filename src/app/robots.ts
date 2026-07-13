import type { MetadataRoute } from "next";

/**
 * The whole app is a gated learner portal - nothing here should ever be
 * indexed. Marketing/SEO lives on elystai.com, not on this host.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
