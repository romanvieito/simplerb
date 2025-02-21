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
            LIMIT 1
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

        // Process the pending email
        const email = pendingEmails[0];
        
        // Call sendEmail endpoint without wrapping email data
        const response = await fetch(`${baseUrl}/api/sendEmail`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`Failed to send email: ${response.statusText}`);
        }

        console.log('Processed email:', {
            id: email.id,
            to: email.to_email,
            subject: email.subject
        });

        return res.status(200).json({ 
            success: true, 
            processed: 1 
        });
    } catch (error) {
        console.error('Error processing emails:', error);
        return res.status(500).json({ error: error.message });
    }
} 