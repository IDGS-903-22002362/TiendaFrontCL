import type { NextConfig } from "next";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:3000";

const baseSecurityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const defaultCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://js.stripe.com https://www.gstatic.com https://www.google.com https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: http://localhost:3000",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${apiBaseUrl} https://*.googleapis.com https://api.stripe.com https://js.stripe.com https://hooks.stripe.com https://*.cloudfunctions.net https://*.firebaseapp.com https://*.firebaseio.com wss://*.firebaseio.com`,
  "frame-src 'self' https://apis.google.com https://js.stripe.com https://hooks.stripe.com https://www.google.com https://*.firebaseapp.com",
].join("; ");

const checkoutCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://js.stripe.com https://www.gstatic.com https://www.google.com https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${apiBaseUrl} https://*.googleapis.com https://api.stripe.com https://js.stripe.com https://hooks.stripe.com https://*.cloudfunctions.net https://*.firebaseapp.com`,
  "frame-src 'self' https://apis.google.com https://js.stripe.com https://hooks.stripe.com https://www.google.com https://*.firebaseapp.com",
].join("; ");

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/checkout/:path*",
        headers: [
          ...baseSecurityHeaders,
          { key: "Content-Security-Policy", value: checkoutCsp },
        ],
      },
      {
        source: "/:path*",
        headers: [
          ...baseSecurityHeaders,
          { key: "Content-Security-Policy", value: defaultCsp },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
