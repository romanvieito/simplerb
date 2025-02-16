import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        // Create a test email in the database
        const { rows } = await sql`
            INSERT INTO emails (
                to_email,
                subject,
                body,
                status
            ) VALUES (
                'romanvieito@gmail.com',
                'Test Email',
                '<div><h1>Test Email</h1><p>This is a test email with a <a href="https://example.com">test link</a>.</p></div>',
                'pending'
            ) RETURNING id`;

        const emailId = rows[0].id;

        // Send the email using our sendEmail endpoint
        const response = await fetch('http://localhost:3000/api/sendEmail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: 'romanvieito@gmail.com',
                subject: 'Test Email',
                html: '<div><h1>Test Email</h1><p>This is a test email with a <a href="https://example.com">test link</a>.</p></div>',
                emailId: emailId
            })
        });

        const result = await response.json();

        return res.status(200).json({
            message: 'Test email process completed',
            emailId,
            result
        });

    } catch (error) {
        console.error('Error in test send:', error);
        return res.status(500).json({ error: error.message });
    }
} 