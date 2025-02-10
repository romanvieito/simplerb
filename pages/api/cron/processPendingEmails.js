import { sql } from '@vercel/postgres';

// Remove the edge config - use regular serverless function instead
// export const config = {
//     runtime: 'edge',
//     regions: ['iad1']
// };

// Change to regular API route format
export default async function handler(req, res) {
    try {
        // Process pending emails
        const { rows: pendingEmails } = await sql`
            SELECT * FROM emails 
            WHERE status = 'pending'
            LIMIT 50
        `;

        if (pendingEmails.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'No pending emails' 
            });
        }

        // Your email sending logic here
        for (const email of pendingEmails) {
            try {
                // Send email
                await sendEmail(email.to_email, email.subject, email.body);
                
                // Update status to sent
                await sql`
                    UPDATE emails 
                    SET status = 'sent', 
                        sent_at = NOW() 
                    WHERE id = ${email.id}
                `;
            } catch (error) {
                // Mark as failed if sending fails
                await sql`
                    UPDATE emails 
                    SET status = 'failed', 
                        error = ${error.message} 
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