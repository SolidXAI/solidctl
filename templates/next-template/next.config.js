/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/auth/login',
        permanent: false, // Set to true if you want it to be a permanent redirect (301)
      },
    ];
  },
  env: {
    API_URL: process.env.API_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
    SOLIDX_ON_APPLICATION_MOUNT_HANDLER:process.env.SOLIDX_ON_APPLICATION_MOUNT_HANDLER,

    NEXT_PUBLIC_ENABLE_CUSTOM_HEADER_FOOTER: process.env.NEXT_PUBLIC_ENABLE_CUSTOM_HEADER_FOOTER,
    SOLID_APP_TITLE: process.env.NEXT_PUBLIC_SOLID_APP_TITLE,
    SOLID_APP_DESCRIPTION: process.env.NEXT_PUBLIC_SOLID_APP_DESCRIPTION,
    NEXT_PUBLIC_DEFAULT_MENU_KEY: process.env.NEXT_PUBLIC_DEFAULT_MENU_KEY,

    NEXTAUTH_SECRET: "KSDFJKLSDJFLKSDFJSLDKF934KJLDJGDLKGFJDF",
    REVALIDATE_TOKEN: "JK34J50JSDKFLJSDKF034I5DKFJSDK4IJFKSDJFL",
  },
  images: {
    remotePatterns: getRemotePatterns(),
  },
  productionBrowserSourceMaps: true,
  transpilePackages: ['@solidxai/core-ui'],
  experimental: {
    externalDir: true,
  },
};

function getRemotePatterns(){
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_REMOTE_PATTERNS || '[]');
  } catch (error) {
    return [];
  }
}




module.exports = nextConfig;
