import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        // Create an email with proper links (no @ symbol)
        const testHtml = `
            <div>
                <p>Hello! This is a test email with tracking links:</p>
                <p>
                    <a href="https://github.com">Visit GitHub</a>
                </p>
            </div>
        `;

        console.log('Original HTML:', testHtml); // Debug log

        // Insert into emails table
        const { rows: [email] } = await sql`
            INSERT INTO emails (
                to_email,
                subject,
                body,
                status
            ) VALUES (
                'romanvieito@gmail.com',
                'Test Multiple Links',
                ${testHtml},
                'pending'
            ) RETURNING *;
        `;

        console.log('Stored email:', email); // Debug log

        // Send directly
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

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
        console.log('Send result:', result); // Debug log

        return res.status(200).json({ 
            message: 'Test email sent',
            emailId: email.id,
            originalHtml: testHtml,
            storedEmail: email,
            sendResult: result
        });
    } catch (error) {
        console.error('Test failed:', error);
        return res.status(500).json({ error: error.message });
    }
} 