/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcrypt'],
  },
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
