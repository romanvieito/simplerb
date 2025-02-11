import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        // Get total sent and opened counts
        const { rows: [totals] } = await sql`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
                COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as total_opened
            FROM emails;
        `;

        // Get recent opens
        const { rows: recentOpens } = await sql`
            SELECT to_email as email, opened_at, open_count
            FROM emails
            WHERE opened_at IS NOT NULL
            ORDER BY opened_at DESC
            LIMIT 5;
        `;

        return res.status(200).json({
            totalSent: parseInt(totals.total_sent),
            totalOpened: parseInt(totals.total_opened),
            recentOpens
        });
    } catch (error) {
        console.error('Error fetching tracking stats:', error);
        return res.status(500).json({ error: error.message });
    }
} 