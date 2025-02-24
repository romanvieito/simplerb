import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        const { period = 'day' } = req.query;
        
        let query;
        if (period === 'hour') {
            query = await sql`
                SELECT 
                    e.to_email,
                    c.link_url,
                    c.clicked_at
                FROM email_clicks c
                JOIN emails e ON e.id = c.email_id
                WHERE c.clicked_at > NOW() - INTERVAL '1 hour'
                ORDER BY c.clicked_at DESC
                LIMIT 50;
            `;
        } else if (period === 'day') {
            query = await sql`
                SELECT 
                    e.to_email,
                    c.link_url,
                    c.clicked_at
                FROM email_clicks c
                JOIN emails e ON e.id = c.email_id
                WHERE c.clicked_at > NOW() - INTERVAL '24 hours'
                ORDER BY c.clicked_at DESC
                LIMIT 50;
            `;
        } else if (period === 'week') {
            query = await sql`
                SELECT 
                    e.to_email,
                    c.link_url,
                    c.clicked_at
                FROM email_clicks c
                JOIN emails e ON e.id = c.email_id
                WHERE c.clicked_at > NOW() - INTERVAL '7 days'
                ORDER BY c.clicked_at DESC
                LIMIT 50;
            `;
        } else {
            query = await sql`
                SELECT 
                    e.to_email,
                    c.link_url,
                    c.clicked_at
                FROM email_clicks c
                JOIN emails e ON e.id = c.email_id
                ORDER BY c.clicked_at DESC
                LIMIT 50;
            `;
        }
        
        return res.status(200).json(query.rows);
    } catch (error) {
        console.error('Error fetching click stats:', error);
        return res.status(500).json({ error: error.message });
    }
} 