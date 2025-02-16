import { sql } from '@vercel/postgres';

export const config = {
    runtime: 'edge',
    regions: ['iad1'] 
}

export default async function handler(req) {
    try {
        // Get emails that haven't been sent yet
        const { rows: emailsToQueue } = await sql`
            SELECT * FROM email_list 
            WHERE send_count = 0 AND active = true
            ORDER BY id ASC
            LIMIT 100
        `;

        // Queue new emails
        for (const email of emailsToQueue) {
            // const subject = `Daily Update for ${email.name || 'you'}`;
            const subject = `Boost Your AI Faceless Shorts 🚀`;
            const greeting = email.name ? `Hey ${email.name},` : 'Hey,';
            const body = `${greeting}

I see you're using AI for faceless Shorts—great choice! I'm on the same journey.

Just made a video to test what's working (and what's not) for AI creators like us.

🎥 Take a look: https://youtube.com/shorts/M9Kcc7K9Mts

Would love to hear what's working for you too!

Cheers,
Yai`;

            await sql`
                INSERT INTO emails (to_email, subject, body, status)
                VALUES (${email.email}, ${subject}, ${body}, 'pending')
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