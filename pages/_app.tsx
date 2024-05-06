import { Analytics } from '@vercel/analytics/react';
import type { AppProps } from 'next/app';
import { ClerkProvider } from '@clerk/nextjs'
import '../styles/globals.css';
import { GoogleTagManager } from '@next/third-parties/google'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <ClerkProvider>
        <Component {...pageProps} />
        <GoogleTagManager gtmId="GTM-M8JSHTNM" />
        <Analytics />
      </ClerkProvider>
    </>
  );
}

export default MyApp;
