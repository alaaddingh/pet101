const nextConfig = {
  images: {
    // Allow the sources used in pets, spells, abilities
    remotePatterns: [
      { protocol: 'https', hostname: 'web.archive.org' },
      { protocol: 'https', hostname: 'wiki.wizard101central.com' },
    ],
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
