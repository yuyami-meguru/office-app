import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 静的最適化を無効化してクライアントサイドレンダリングを優先
  experimental: {
    // すべてのページでクライアントサイドレンダリングを強制
  },
};

export default nextConfig;
