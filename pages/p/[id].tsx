import { GetServerSideProps } from 'next';
import { sql } from '@vercel/postgres';
import Head from 'next/head';

interface PublishedPage {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface PageProps {
  page: PublishedPage;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const { id } = params as { id: string };

  try {
    const result = await sql`
      SELECT id, title, content, created_at
      FROM published_pages
      WHERE id = ${id}
    `;

    if (result.rows.length === 0) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        page: result.rows[0],
      },
    };
  } catch (error) {
    console.error('Error fetching page:', error);
    return {
      notFound: true,
    };
  }
};

export default function PublishedPage({ page }: PageProps) {
  return (
    <>
      <Head>
        <title>{page.title}</title>
        <meta name="description" content={page.title} />
      </Head>
      <div className="min-h-screen bg-white">
        <main className="container mx-auto px-4 py-8">
          {/* <h1 className="text-4xl font-bold mb-6">{page.title}</h1> */}
          <div 
            /* className="prose max-w-none" */
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </main>
      </div>
    </>
  );
} 