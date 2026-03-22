import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.faplaconline.com.ar',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'www.faplaconline.com.ar',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.egger.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
