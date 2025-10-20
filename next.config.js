/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Disable any experimental features that might cause deployment issues
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
  // Temporarily disabled rewrites to test deployment
  // async rewrites() {
  //   return [
  //     {
  //       source: '/:path*',
  //       destination: '/api/subdomain-handler',
  //       has: [
  //         {
  //           type: 'host',
  //           value: '(?<subdomain>.*).simplerb.com'
  //         }
  //       ]
  //     }
  //   ];
  // },
};
