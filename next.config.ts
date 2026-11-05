import type { NextConfig } from "next";

// En-têtes de sécurité HTTP appliqués à toutes les pages. Standard de base
// pour toute application avec authentification et données personnelles.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Page autonome « Atelier Maths SN4 » (public/math/index.html), accessible
  // à l'adresse /math sans avoir à écrire index.html.
  async rewrites() {
    return [{ source: "/math", destination: "/math/index.html" }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
