import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 静的生成を無効化
  output: 'standalone',
};

export default nextConfig;
