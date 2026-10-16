import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects: async () => [
    { source: "/cars/demo-toyota-rav4", destination: "/cars/2021-toyota-rav4", permanent: true },
    { source: "/cars/demo-honda-fit", destination: "/cars/2018-honda-fit", permanent: true },
  ],
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/site-assets/**" }],
  },
};

export default nextConfig;
