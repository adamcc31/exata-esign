/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg', 'bcrypt'],
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
