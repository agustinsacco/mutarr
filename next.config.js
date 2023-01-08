/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: './build/client',
  publicRuntimeConfig: {
      NODE_ENV: process.env.NODE_ENV,
      CLIENT_HOST: process.env.CLIENT_HOST
  },
}

module.exports = nextConfig