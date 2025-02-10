import { sql } from '@vercel/postgres';

export const config = {
    runtime: 'edge',
    regions: ['iad1']
};

export default async function handler(req) {
    try {
        // Process pending emails
        const { rows: pendingEmails } = await sql`
            SELECT * FROM emails 
            WHERE status = 'pending'
            LIMIT 50  // Process in batches to avoid timeout
        `;

        if (pendingEmails.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'No pending emails' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
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

        return new Response(
            JSON.stringify({ 
                success: true, 
                processed: pendingEmails.length 
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
} 