import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { subdomain } = req.query;

    if (!subdomain || typeof subdomain !== 'string') {
      return res.status(400).json({ message: 'Subdomain is required' });
    }

    // Get the HTML content for the site
    const result = await sql`
      SELECT html 
      FROM sites 
      WHERE subdomain = ${subdomain}
      ORDER BY created_at DESC 
      LIMIT 1;
    `;

    if (result.rows.length === 0) {
      return res.status(404).send('Site not found');
    }

    const html = result.rows[0].html;

    // Create a preview version with minimal styling and responsive design
    const previewHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview - ${subdomain}.simplerb.com</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .preview-container {
            transform: scale(0.5);
            transform-origin: top left;
            width: 200%;
            height: 200%;
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          ${html}
        </div>
      </body>
      </html>
    `;

    // Set headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Send the preview HTML
    return res.send(previewHtml);
  } catch (error) {
    console.error('Error in site-preview:', error);
    return res.status(500).send('Error generating preview');
  }
}
