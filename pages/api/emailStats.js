import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        const { period = 'day' } = req.query;
        
        let query;
        if (period === 'hour') {
            query = await sql`
                SELECT status, COUNT(*)::integer as count
                FROM emails
                WHERE created_at > NOW() - INTERVAL '1 hour'
                GROUP BY status;
            `;
        } else if (period === 'day') {
            query = await sql`
                SELECT status, COUNT(*)::integer as count
                FROM emails
                WHERE created_at > NOW() - INTERVAL '24 hours'
                GROUP BY status;
            `;
        } else if (period === 'week') {
            query = await sql`
                SELECT status, COUNT(*)::integer as count
                FROM emails
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY status;
            `;
        } else {
            query = await sql`
                SELECT status, COUNT(*)::integer as count
                FROM emails
                GROUP BY status;
            `;
        }
        
        return res.status(200).json(query.rows);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Failed to fetch email stats' });
    }
} 