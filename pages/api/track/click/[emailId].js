import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    console.log('=== Click Tracking Start ===');
    const { emailId, url } = req.query;
    
    console.log('Request params:', { emailId, url });

    if (!emailId || !url) {
        console.log('Missing parameters:', { emailId, url });
        return res.status(400).json({ error: 'Missing emailId or url' });
    }

    try {
        const decodedUrl = decodeURIComponent(url);
        console.log('Decoded URL:', decodedUrl);
        
        // Log the SQL query we're about to execute
        console.log('Checking for existing click:', { emailId, decodedUrl });
        
        const { rows } = await sql`
            SELECT id FROM email_clicks 
            WHERE email_id = ${emailId} 
            AND link_url = ${decodedUrl}
        `;
        
        console.log('Existing rows found:', rows.length);

        if (rows.length > 0) {
            console.log('Updating existing click record');
            await sql`
                UPDATE email_clicks 
                SET click_count = click_count + 1,
                    clicked_at = NOW()
                WHERE email_id = ${emailId} 
                AND link_url = ${decodedUrl}
            `;
        } else {
            console.log('Inserting new click record');
            await sql`
                INSERT INTO email_clicks (email_id, link_url, clicked_at, click_count)
                VALUES (${emailId}, ${decodedUrl}, NOW(), 1)
            `;
        }

        console.log('Click record processed successfully');
        console.log('=== Click Tracking End ===');
        
        // Redirect to the actual URL
        res.redirect(307, decodedUrl);
        return;
    } catch (error) {
        console.error('=== Click Tracking Error ===');
        console.error('Full error:', error);
        console.error('Stack:', error.stack);
        // Still redirect even if tracking fails
        res.redirect(307, decodeURIComponent(url));
        return;
    }
}