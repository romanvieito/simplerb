import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        // First create the email to get the ID
        const { rows: [email] } = await sql`
            INSERT INTO emails (
                to_email,
                subject,
                status,
                body
            ) VALUES (
                'romanvieito@gmail.com',
                'Test Multiple Links',
                'pending',
                'Initial body'
            ) RETURNING *;
        `;

        // Create HTML with tracking links
        const trackingUrl = `${baseUrl}/api/track/click/${email.id}?url=${encodeURIComponent('https://github.com')}`;
        const testHtml = `
            <div>
                <p>Hello! This is a test email with tracking links:</p>
                <p>
                    <a href="${trackingUrl}">Visit GitHub</a>
                </p>
            </div>
        `;

        // Update the email with the HTML containing tracking links
        await sql`
            UPDATE emails 
            SET body = ${testHtml}
            WHERE id = ${email.id}
        `;

        // Send the email
        const response = await fetch(`${baseUrl}/api/sendEmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: 'romanvieito@gmail.com',
                subject: 'Test Multiple Links',
                html: testHtml,
                emailId: email.id
            })
        });

        const result = await response.json();
        console.log('Send result:', result);

        return res.status(200).json({ 
            message: 'Test email sent',
            emailId: email.id,
            originalHtml: testHtml,
            trackingUrl,
            sendResult: result
        });
    } catch (error) {
        console.error('Test failed:', error);
        return res.status(500).json({ error: error.message });
    }
} 