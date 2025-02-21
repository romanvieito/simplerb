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
        // For local testing, hardcode localhost if needed
        const baseUrl = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3000'  // Use http for local development
            : `https://${process.env.NEXT_PUBLIC_VERCEL_URL || req.headers.host}`;
            
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
            // Get more detailed error information
            const errorText = await response.text();
            console.error('Send email failed:', {
                status: response.status,
                statusText: response.statusText,
                responseBody: errorText
            });
            throw new Error(`Failed to send email: ${response.statusText}. Response: ${errorText}`);
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