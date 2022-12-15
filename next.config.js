/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: './build/client',
  publicRuntimeConfig: {
      NODE_ENV: process.env.NODE_ENV,
  },
}

module.exports = nextConfig