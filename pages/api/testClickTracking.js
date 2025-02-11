import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        // First, insert a test email into the database
        const { rows: [email] } = await sql`
            INSERT INTO emails (to_email, subject, body, status)
            VALUES (
                'romanvieito@gmail.com', 
                'Track Test', 
                '<p>This is a tracking test email</p>', 
                'pending'
            )
            RETURNING id;
        `;

        // Create the tracking URL with the returned email ID
        const trackingUrl = `http://localhost:3000/api/track/click/${email.id}?url=${encodeURIComponent('https://github.com')}`;
        
        // Update the email with the proper tracking link
        await sql`
            UPDATE emails 
            SET body = ${`<p>This is a tracking test email</p><p><a href="${trackingUrl}">Click to visit GitHub</a></p>`},
                status = 'sent'
            WHERE id = ${email.id}
        `;

        return res.status(200).json({ 
            message: 'Test email created', 
            emailId: email.id,
            trackingUrl
        });
    } catch (error) {
        console.error('Test failed:', error);
        return res.status(500).json({ error: error.message });
    }
} 