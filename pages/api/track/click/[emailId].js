import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    const { emailId } = req.query;
    const { url } = req.query;

    if (!emailId || !url) {
        return res.status(400).json({ error: 'Missing emailId or url' });
    }

    try {
        // Log the click
        await sql`
            INSERT INTO email_clicks (email_id, link_url)
            VALUES (${emailId}, ${url});
        `;

        // Redirect to the actual URL
        return res.redirect(decodeURIComponent(url));
    } catch (error) {
        console.error('Error tracking click:', error);
        // Still redirect even if tracking fails
        return res.redirect(decodeURIComponent(url));
    }
}