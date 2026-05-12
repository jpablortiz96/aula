import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // COOP/COEP headers required for SharedArrayBuffer (ONNX Runtime threads + WebGPU)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },

  // Turbopack (default in Next.js 16) handles WASM and workers natively
  turbopack: {},

  // Webpack fallback config (used when running with --webpack flag)
  webpack(config, { isServer }) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Prevent server-side bundling of browser-only ONNX/transformers modules
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "@huggingface/transformers",
      ];
    }

    return config;
  },
};

export default nextConfig;
