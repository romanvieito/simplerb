import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: NextRequest) {
  const hostname = req.headers.get('host') || '';

  // Check if this is a subdomain request
  const isSubdomain = hostname.includes('.simplerb.com') && !hostname.startsWith('www.') && hostname !== 'simplerb.com';

  // If not a subdomain, pass through to normal Next.js routing
  if (!isSubdomain) {
    return NextResponse.next();
  }

  // Extract subdomain
  const subdomain = hostname.split('.')[0];

  try {
    const result = await sql`
      SELECT html FROM sites
      WHERE subdomain = ${subdomain}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return new NextResponse('Site not found', { status: 404 });
    }

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
