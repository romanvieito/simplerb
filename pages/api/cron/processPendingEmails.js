import { sql } from '@vercel/postgres';

// Remove the edge config - use regular serverless function instead
// export const config = {
//     runtime: 'edge',
//     regions: ['iad1']
// };

// Change to regular API route format
export default async function handler(req, res) {
    try {
        // Get the base URL using the correct environment variable
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? 
                       `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` :
                       `https://${req.headers.host}`;

        if (!baseUrl) {
            throw new Error('Unable to determine application URL');
        }

        // Reset any stuck "processing" emails (simplified without updated_at)
        await sql`
            UPDATE emails 
            SET status = 'pending'
            WHERE status = 'processing'
        `;

        // Then get the next pending email
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

        // Update status to processing (without updated_at)
        await sql`
            UPDATE emails 
            SET status = 'processing'
            WHERE id = ${email.id}
        `;

        // Send to email endpoint
        const response = await fetch(`${baseUrl}/api/sendEmail`, {
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
        return res.status(500).json({ error: error.message });
    }
} 