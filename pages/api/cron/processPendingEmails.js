import { sql } from '@vercel/postgres';

// Remove the edge config - use regular serverless function instead
// export const config = {
//     runtime: 'edge',
//     regions: ['iad1']
// };

// Change to regular API route format
export default async function handler(req, res) {
    try {
        // First, get pending emails
        const { rows: pendingEmails } = await sql`
            SELECT * FROM emails 
            WHERE status = 'pending'
            LIMIT 50
        `;

        if (pendingEmails.length === 0) {
            return res.status(200).json({ 
                message: 'No pending emails to process' 
            });
        }

        // Determine the base URL based on environment
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        // Process each pending email
        for (const email of pendingEmails) {
            try {
                // Call your existing sendEmail endpoint with the email data
                const response = await fetch(`${baseUrl}/api/sendEmail`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: email.to_email,
                        subject: email.subject,
                        html: email.body,
                        emailId: email.id  // Include the email ID for updating status
                    })
                });

                if (!response.ok) {
                    throw new Error(`Failed to send email: ${response.statusText}`);
                }
            } catch (error) {
                console.error(`Failed to process email ${email.id}:`, error);
                // Update status to failed
                await sql`
                    UPDATE emails 
                    SET status = 'failed'
                    WHERE id = ${email.id}
                `;
            }
        }

        return res.status(200).json({ 
            success: true, 
            processed: pendingEmails.length 
        });
    } catch (error) {
        console.error('Error processing emails:', error);
        return res.status(500).json({ error: error.message });
    }
} 