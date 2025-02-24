import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    const { emailId, url } = req.query;
    
    console.log('Tracking click:', { emailId, url }); // Debug log

    if (!emailId || !url) {
        console.log('Missing parameters:', { emailId, url }); // Debug log
        return res.status(400).json({ error: 'Missing emailId or url' });
    }

    try {
        // Log the click
        console.log('Inserting click record...'); // Debug log
        await sql`
            INSERT INTO email_clicks (email_id, link_url)
            VALUES (${emailId}, ${url});
        `;
        console.log('Click record inserted successfully'); // Debug log

        // Redirect to the actual URL
        return res.redirect(decodeURIComponent(url));
    } catch (error) {
        console.error('Error tracking click:', error);
        // Still redirect even if tracking fails
        return res.redirect(decodeURIComponent(url));
    }
}