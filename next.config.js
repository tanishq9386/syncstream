/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i.ytimg.com', 'img.youtube.com'],
  },
  env: {
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  },
  experimental: {
    serverComponentsExternalPackages: ['socket.io']
  },
  output: 'standalone'
}

module.exports = nextConfig
