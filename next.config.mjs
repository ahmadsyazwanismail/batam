/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The trip data is a bundled typed module; there is no backend to talk to.
  // Everything renders from static input, so the whole app can be exported.
  output: 'standalone',
};

export default nextConfig;
