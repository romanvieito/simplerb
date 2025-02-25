import { sql } from '@vercel/postgres';

export const config = {
    runtime: 'edge',
    regions: ['iad1'] 
}

export default async function handler(req) {
    try {
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        // Hardcoded IDs for specific users
        const targetUserIds = [1, 2, 3, 3870, 3871, 3872]; // Replace these with your actual target IDs

        // Get emails that haven't been sent yet and join with template 2
        const { rows: emailsToQueue } = await sql`
            SELECT el.*, et.subject, et.body as template_body 
            FROM email_list el
            JOIN email_templates et ON et.id = 2  -- Using template ID 2
            WHERE el.active = true
            AND el.id = ANY(${targetUserIds}::int[])
            ORDER BY el.id ASC
        `;

        // Queue new emails
        for (const email of emailsToQueue) {
            const greeting = email.name ? `Hey ${email.name},` : 'Hey,';
            const personalizedBody = email.template_body.replace('{greeting}', greeting);

            // First create the email to get the ID
            const { rows: [newEmail] } = await sql`
                INSERT INTO emails (to_email, subject, body, status)
                VALUES (
                    ${email.email}, 
                    ${email.subject}, 
                    ${personalizedBody}, 
                    'pending'
                )
                RETURNING *
            `;

            // Increment the send_count
            await sql`
                UPDATE email_list 
                SET send_count = send_count + 1
                WHERE id = ${email.id}
            `;
        }

        return new Response(
            JSON.stringify({
                success: true,
                queued: emailsToQueue.length
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
        console.error('Error queueing emails:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
} 