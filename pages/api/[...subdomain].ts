import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  
  // Extract subdomain
  const subdomain = hostname.split('.')[0];
  
  // Skip if it's the main domain or www
  if (subdomain === 'www' || subdomain === 'simplerb' || !hostname.includes('.')) {
    return NextResponse.next();
  }
  
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
