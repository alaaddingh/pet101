const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'web.archive.org' },
      { protocol: 'https', hostname: 'wiki.wizard101central.com' },
    ],
    domains: ['web.archive.org', 'wiki.wizard101central.com'],
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
