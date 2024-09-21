import Document, { Head, Html, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <meta
            name="description"
            content="Generate your next business in seconds."
          />
          <meta property="og:site_name" content="simplerB" />
          <meta
            property="og:description"
            content="Generate your next business in seconds."
          />
          <meta property="og:title" content="Business Generator" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Business Generator" />
          <meta
            name="twitter:description"
            content="Generate your next business in seconds."
          />
          <meta
            property="og:image"
            content="Generate your next business in seconds."
          />
          <meta
            name="twitter:image"
            content="Generate your next business in seconds."
          />
          <script
            type="text/javascript"
            dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "o6od8wfrd3");
              `,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
