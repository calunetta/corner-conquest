
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Firebase App Hosting's build adapter (@apphosting/adapter-nextjs) only copies the
  // full public/ folder into the standalone output when Next's own file tracing hasn't
  // already pre-created a *partial* public/ directory there. Our tile-decoration-editor
  // images route does an fs.readdir on a public/sprites/decorations path, so Next's
  // tracer pre-populates just that subfolder, and the adapter's exists-check then skips
  // copying the rest of public/ — every other sprite 404s in production.
  // https://github.com/firebase/apphosting-adapters/issues/630
  outputFileTracingIncludes: {
    '/': ['public/**/*'],
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
    ],
  },
};

export default nextConfig;
