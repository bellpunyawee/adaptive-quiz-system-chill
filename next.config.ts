import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Images are served unoptimized in quiz and admin interfaces
    // to preserve maximum quality for educational content (diagrams, charts, code screenshots).
    // Image components use unoptimized={true} to bypass Next.js optimization pipeline.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
