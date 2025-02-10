import { sql } from '@vercel/postgres';

export const config = {
    runtime: 'edge',
    regions: ['iad1'] 
}

export default async function handler(req) {
    try {
        // 1. Queue new emails
        const { rows: activeSubscribers } = await sql`
            SELECT email, name FROM email_list WHERE active = true
        `;

        // Queue personalized emails
        for (const subscriber of activeSubscribers) {
            // const subject = `Daily Update for ${subscriber.name || 'you'}`;
            const subject = `Boost Your AI Faceless Shorts 🚀`;
            const greeting = subscriber.name ? `Hey ${subscriber.name},` : 'Hey,';
            const body = `${greeting}

I see you're using AI for faceless Shorts—great choice! I'm on the same journey.

Just made a video to test what's working (and what's not) for AI creators like us.

🎥 Take a look: https://www.youtube.com/shorts/wf1BKypzhe4

Would love to hear what's working for you too!

Cheers,
Yai`;

            await sql`
                INSERT INTO emails (to_email, subject, body, status)
                VALUES (${subscriber.email}, ${subject}, ${body}, 'pending')
            `;
        }

        return new Response(
            JSON.stringify({
                success: true,
                queued: activeSubscribers.length
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