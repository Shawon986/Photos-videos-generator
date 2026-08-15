import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/creation/"],
        disallow: ["/api/", "/dashboard", "/create", "/settings", "/login", "/register"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
