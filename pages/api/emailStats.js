import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        const stats = await sql`
            SELECT 
                status,
                COUNT(*) as count
            FROM emails
            GROUP BY status
        `;
        
        return res.status(200).json(stats.rows);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
} 