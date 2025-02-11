import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    const { trackingId } = req.query;

    try {
        // Log the email open
        await sql`
            UPDATE emails 
            SET 
                opened_at = COALESCE(opened_at, NOW()),  -- Only update if not already opened
                open_count = COALESCE(open_count, 0) + 1 -- Increment open count
            WHERE id = ${trackingId}
        `;

        // Return a 1x1 transparent GIF
        const buffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        return res.send(buffer);
    } catch (error) {
        console.error('Error tracking email open:', error);
        return res.status(500).send('Error tracking email open');
    }
} 