import { sql } from '@vercel/postgres';

// Remove the edge config - use regular serverless function instead
// export const config = {
//     runtime: 'edge',
//     regions: ['iad1']
// };

// Change to regular API route format
export default async function handler(req, res) {
    let email = null; // Define email variable in outer scope
    try {
        // Fix the base URL construction
        const baseUrl = process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : 'https://simplerb.com';  // Direct URL without double https://
            
        console.log('Using base URL:', baseUrl); // Debug log

        // Reset any stuck "processing" emails
        await sql`
            UPDATE emails 
            SET status = 'pending'
            WHERE status = 'processing'
        `;

        const { rows: pendingEmails } = await sql`
            SELECT * FROM emails WHERE status = 'pending' LIMIT 1;
        `;

        if (pendingEmails.length === 0) {
            return res.status(200).json({ 
                success: true, 
                processed: 0,
                message: 'No pending emails' 
            });
        }

        email = pendingEmails[0]; // Assign to outer scope variable

        await sql`
            UPDATE emails 
            SET status = 'processing'
            WHERE id = ${email.id}
        `;

        // Construct absolute URL for the API endpoint
        const apiUrl = new URL('/api/sendEmail', baseUrl).toString();
        console.log('Sending request to:', apiUrl); // Debug log
        console.log('Request body:', {
            id: email.id,
            to: email.to_email,
            subject: email.subject
        });

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
        // Now email will be defined in this scope
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