import { Analytics } from '@vercel/analytics/react';
import type { AppProps } from 'next/app';
import { ClerkProvider } from '@clerk/nextjs'
import '../styles/globals.css';
import { GoogleTagManager } from '@next/third-parties/google'
import { SBRProvider } from '../context/SBRContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <ClerkProvider>
        <SBRProvider>
          <Component {...pageProps} />
          <GoogleTagManager gtmId="GTM-M8JSHTNM" />
          <Analytics />
        </SBRProvider>
      </ClerkProvider>
    </>
  );
}

export default MyApp;
