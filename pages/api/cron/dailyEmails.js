import { sql } from '@vercel/postgres';

export const config = {
    runtime: 'edge',
    regions: ['mia1']
}

// Runs at 9:00 AM EST (14:00 UTC)
export const cron = '0 14 * * *';

export default async function handler(req) {
    try {
        // 1. Queue new emails
        const { rows: activeSubscribers } = await sql`
            SELECT email, name FROM email_list WHERE active = true
        `;

        // Queue personalized emails
        for (const subscriber of activeSubscribers) {
            const subject = `Daily Update for ${subscriber.name || 'you'}`;
            const greeting = subscriber.name ? `Dear ${subscriber.name},` : 'Hello,';
            const body = `${greeting}

Here are your updates for ${new Date().toLocaleDateString()}.

Have a great day!

Best regards,
Your Team`;

            await sql`
                INSERT INTO emails (to_email, subject, body)
                VALUES (${subscriber.email}, ${subject}, ${body})
            `;
        }

        // 2. Trigger email sending immediately
        const sendResponse = await fetch('http://localhost:3000/api/sendEmail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const sendResult = await sendResponse.json();

        return new Response(
            JSON.stringify({
                success: true,
                queued: activeSubscribers.length,
                sendResult
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