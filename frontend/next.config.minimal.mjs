/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Temporarily disable type checking
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Temporarily disable ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Handle images
  images: {
    domains: ['localhost', 'api.padelyzer.com'],
  },
  
  // Basic i18n config
  i18n: {
    locales: ['en', 'es', 'pt'],
    defaultLocale: 'es',
  },
}

export default nextConfig;