import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        const clicks = await sql`
            SELECT 
                e.to_email,
                c.link_url,
                c.clicked_at
            FROM email_clicks c
            JOIN emails e ON e.id = c.email_id
            ORDER BY c.clicked_at DESC
            LIMIT 50;
        `;
        
        return res.status(200).json(clicks.rows);
    } catch (error) {
        console.error('Error fetching click stats:', error);
        return res.status(500).json({ error: error.message });
    }
} 