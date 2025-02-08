import { sql } from '@vercel/postgres';

export const config = {
    runtime: 'edge',
    regions: ['iad1'],  // US East (N. Virginia)
}

// Vercel Cron syntax (runs every day at 9:00 AM EST)
export const cron = '0 9 * * *';

async function queueEmails() {
    const subject = "Your Daily Update";
    const body = `Here are your updates for ${new Date().toLocaleDateString()}.\n\nHave a great day!`;

    // Get all active subscribers
    const { rows: activeSubscribers } = await sql`
        SELECT email, name FROM email_list WHERE active = true
    `;

    // Queue personalized emails
    for (const subscriber of activeSubscribers) {
        // Personalize subject
        const personalizedSubject = subject.replace(
            '{name}', 
            subscriber.name || 'there'
        );

        // Build personalized greeting
        let greeting = subscriber.name ? `Dear ${subscriber.name},` : 'Hello,';

        // Build personalized body
        const personalizedBody = `${greeting}

${body}

Best regards,
Your Team

---
`;

        await sql`
            INSERT INTO emails (to_email, subject, body)
            VALUES (${subscriber.email}, ${personalizedSubject}, ${personalizedBody})
        `;
    }

    return activeSubscribers.length;
}

async function sendEmails() {
    // Get pending emails
    const { rows: pendingEmails } = await sql`
        SELECT * FROM emails 
        WHERE status = 'pending' 
        ORDER BY created_at ASC
        LIMIT 10
    `;

    // Process each email
    for (const email of pendingEmails) {
        try {
            // Your existing email sending code here
            await sql`
                UPDATE emails 
                SET status = 'sent', sent_at = NOW() 
                WHERE id = ${email.id}
            `;
        } catch (error) {
            await sql`
                UPDATE emails 
                SET status = 'failed' 
                WHERE id = ${email.id}
            `;
        }
    }

    return pendingEmails.length;
}

export default async function handler(req) {
    try {
        // Queue new emails
        const queuedCount = await queueEmails();
        
        // Send pending emails
        const sentCount = await sendEmails();

        return new Response(
            JSON.stringify({
                success: true,
                queued: queuedCount,
                sent: sentCount
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
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