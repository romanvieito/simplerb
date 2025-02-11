import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        const { period = 'all' } = req.query;
        
        // Get total sent and opened counts
        let query;
        if (period === 'hour') {
            query = await sql`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '1 hour') as total_sent,
                    COUNT(*) FILTER (WHERE opened_at IS NOT NULL AND sent_at > NOW() - INTERVAL '1 hour') as total_opened
                FROM emails;
            `;
        } else if (period === 'day') {
            query = await sql`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '24 hours') as total_sent,
                    COUNT(*) FILTER (WHERE opened_at IS NOT NULL AND sent_at > NOW() - INTERVAL '24 hours') as total_opened
                FROM emails;
            `;
        } else if (period === 'week') {
            query = await sql`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '7 days') as total_sent,
                    COUNT(*) FILTER (WHERE opened_at IS NOT NULL AND sent_at > NOW() - INTERVAL '7 days') as total_opened
                FROM emails;
            `;
        } else {
            query = await sql`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
                    COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as total_opened
                FROM emails;
            `;
        }

        const { rows: [totals] } = query;

        // Get recent opens (always show most recent regardless of time filter)
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