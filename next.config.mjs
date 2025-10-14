/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/jira/:path*',
        destination: '/api/jira/:path*',
      },
    ];
  },

  // Environment variables
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    JIRA_BASE_URL: process.env.JIRA_BASE_URL,
    JIRA_AUTH_TOKEN: process.env.JIRA_AUTH_TOKEN,
  },

  // Webpack configuration for server-side dependencies
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@langchain/langgraph', '@langchain/core');
    }
    return config;
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Output configuration
  output: 'standalone',
};

export default nextConfig;
