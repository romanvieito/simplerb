import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    const { id } = req.query;
    
    try {
        // Update opened_at and increment open_count
        await sql`
            UPDATE emails 
            SET 
                opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP),
                open_count = open_count + 1
            WHERE id = ${id}
        `;

        // Return a transparent 1x1 pixel GIF
        res.setHeader('Content-Type', 'image/gif');
        res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } catch (error) {
        console.error('Error tracking open:', error);
        res.status(500).json({ error: 'Failed to track open' });
    }
} 