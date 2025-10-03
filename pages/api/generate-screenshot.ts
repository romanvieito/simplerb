import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { subdomain } = req.body;

    if (!subdomain) {
      return res.status(400).json({ message: 'Subdomain is required' });
    }

    const siteUrl = `https://${subdomain}.simplerb.com`;
    
    // Use a free screenshot service (like htmlcsstoimage.com or similar)
    // For now, let's use a simple approach with a placeholder
    // In production, you could use services like:
    // - htmlcsstoimage.com
    // - urlbox.io
    // - screenshotapi.net
    
    try {
      // For now, we'll generate a simple thumbnail URL
      // This could be replaced with a real screenshot service
      const thumbnailUrl = `https://api.screenshotmachine.com?key=YOUR_API_KEY&url=${encodeURIComponent(siteUrl)}&dimension=1280x720&format=png`;
      
      // Fetch the screenshot
      const response = await fetch(thumbnailUrl);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        
        // Store screenshot in database
        await sql`
          UPDATE sites 
          SET screenshot = ${base64}
          WHERE subdomain = ${subdomain}
        `;

        return res.status(200).json({ 
          success: true,
          screenshot: `data:image/png;base64,${base64}`
        });
      }
    } catch (screenshotError) {
      console.error('Screenshot service error:', screenshotError);
    }

    // Fallback: Generate a simple placeholder
    const placeholderSvg = `
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">
          ${subdomain}.simplerb.com
        </text>
        <text x="50%" y="55%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">
          Website Preview
        </text>
      </svg>
    `;
    
    const base64Placeholder = Buffer.from(placeholderSvg).toString('base64');
    
    // Store placeholder in database
    await sql`
      UPDATE sites 
      SET screenshot = ${base64Placeholder}
      WHERE subdomain = ${subdomain}
    `;

    return res.status(200).json({ 
      success: true,
      screenshot: `data:image/svg+xml;base64,${base64Placeholder}`
    });

  } catch (error) {
    console.error('Error generating screenshot:', error);
    return res.status(500).json({ 
      message: 'Error generating screenshot',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
