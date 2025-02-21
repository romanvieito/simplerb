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
            LIMIT 1
        `;

        // Queue new emails
        for (const email of emailsToQueue) {
            // const subject = `Daily Update for ${email.name || 'you'}`;
            const subject = `Boost Your AI Shorts 🚀`;
            const greeting = email.name ? `Hey ${email.name},` : 'Hey,';
            const body = `${greeting}<br>
<br>
I see you're using AI for Shorts—great choice! I'm on the same journey.<br>
<br>
Just made a quick video to test what's working (and what's not) for AI creators like us. Take a look: https://www.youtube.com/shorts/oU-WiAJxQ5A<br>
<br>
Would love to hear what's working for you too!<br>
<br>
Cheers,<br>
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