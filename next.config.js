/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/github",
        destination: "https://github.com/Nutlope/twitterbio",
        permanent: false,
      },
      {
        source: "/deploy",
        destination: "https://vercel.com/templates/next.js/twitter-bio",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/(.*)',
        destination: '/api/subdomain-handler',
        has: [
          {
            type: 'host',
            value: '(?<subdomain>.*).simplerb.com'
          }
        ]
      }
    ];
  },
};
