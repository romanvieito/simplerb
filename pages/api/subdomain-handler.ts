import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  const url = req.url;

  console.log('Subdomain handler called:', { hostname, url });

  // Check if this is a subdomain request
  const isSubdomain = hostname.includes('.simplerb.com') && !hostname.startsWith('www.') && hostname !== 'simplerb.com';

  console.log('Is subdomain:', isSubdomain, { hostname });

  // If not a subdomain, pass through to normal Next.js routing
  if (!isSubdomain) {
    console.log('Not a subdomain, passing through');
    return NextResponse.next();
  }

  // Extract subdomain
  const subdomain = hostname.split('.')[0];

  console.log('Extracted subdomain:', subdomain);

  try {
    console.log('Querying database for subdomain:', subdomain);
    const result = await sql`
      SELECT html FROM sites
      WHERE subdomain = ${subdomain}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    console.log('Database query result:', { rowCount: result.rows.length });

    if (result.rows.length === 0) {
      console.log('Site not found for subdomain:', subdomain);
      return new NextResponse('Site not found', { status: 404 });
    }

    console.log('Site found, serving HTML content');
    return new NextResponse(result.rows[0].html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving subdomain site:', error);
    return new NextResponse('Error serving site', { status: 500 });
  }
}
