import { sql } from '@vercel/postgres';

// Remove the edge config - use regular serverless function instead
// export const config = {
//     runtime: 'edge',
//     regions: ['iad1']
// };

// Change to regular API route format
export default async function handler(req, res) {
    try {
        // Ensure we have a properly formatted URL
        const baseUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL || req.headers.host}`;
        console.log('Using base URL:', baseUrl); // Debug log

        // Reset any stuck "processing" emails
        await sql`
            UPDATE emails 
            SET status = 'pending'
            WHERE status = 'processing'
        `;

        const { rows: pendingEmails } = await sql`
            SELECT * FROM emails 
            WHERE status = 'pending'
            LIMIT 1
        `;

        if (pendingEmails.length === 0) {
            return res.status(200).json({ 
                success: true, 
                processed: 0,
                message: 'No pending emails' 
            });
        }

        const email = pendingEmails[0];

        await sql`
            UPDATE emails 
            SET status = 'processing'
            WHERE id = ${email.id}
        `;

        // Construct absolute URL for the API endpoint
        const apiUrl = new URL('/api/sendEmail', baseUrl).toString();
        console.log('Sending request to:', apiUrl); // Debug log

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: email.id,
                to: email.to_email,
                subject: email.subject
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to send email: ${response.statusText}`);
        }

        return res.status(200).json({ 
            success: true, 
            processed: 1 
        });

    } catch (error) {
        console.error('Error processing emails:', error);
        // If there's an error, reset the email status back to pending
        if (email?.id) {
            await sql`
                UPDATE emails 
                SET status = 'pending'
                WHERE id = ${email.id}
            `;
        }
        return res.status(500).json({ error: error.message });
    }
} 