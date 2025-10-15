const nextConfig = {
  images: {
    // Allow the sources used in pets, spells, abilities
    remotePatterns: [
      { protocol: 'https', hostname: 'web.archive.org' },
      { protocol: 'https', hostname: 'wiki.wizard101central.com' },
    ],
    // Also include domains for older/strict configs
    domains: ['web.archive.org', 'wiki.wizard101central.com'],
    // Disable optimization to avoid remote host blocking/proxy issues on Vercel
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
